# backend/agents/triage_agent.py
import asyncio
import json
import requests
from typing import Dict, Any, Optional
import traceback

class TriageAgent:
    def __init__(self, fastapi_url: str = "http://localhost:8000"):
        self.fastapi_url = fastapi_url
        
    async def handle_request(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Main A2A message handler with comprehensive error handling"""
        try:
            task_type = message.get("task", "analyze_symptoms")
            data = message.get("data", {})
            
            if task_type == "analyze_symptoms":
                return await self.analyze_symptoms(data)
            else:
                return {
                    "agent": "TriageAgent",
                    "error": f"Unknown task: {task_type}",
                    "status": "error",
                    "available_tasks": ["analyze_symptoms"]
                }
        except Exception as e:
            return {
                "agent": "TriageAgent", 
                "error": f"Handler error: {str(e)}",
                "status": "error",
                "traceback": traceback.format_exc()
            }
    
    async def analyze_symptoms(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze symptoms using existing FastAPI triage endpoint"""
        
        # Extract and validate input data
        symptoms = data.get("symptoms", "").strip()
        user_id = data.get("user_id", data.get("userId", "unknown_user"))
        vitals = data.get("vitals", {})
        
        # Input validation
        if not symptoms:
            return {
                "agent": "TriageAgent",
                "error": "No symptoms provided",
                "status": "error",
                "required_fields": ["symptoms"]
            }
        
        try:
            # Prepare request payload matching your existing TriageIn model
            payload = {
                "userId": str(user_id),
                "symptoms": symptoms,
                "vitals": vitals if isinstance(vitals, dict) else {}
            }
            
            # Call your existing FastAPI triage endpoint
            response = requests.post(
                f"{self.fastapi_url}/triage",
                json=payload,
                timeout=15,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                triage_result = response.json()
                
                # Extract data safely with defaults
                risk_level = triage_result.get("risk", "unknown")
                guidance = triage_result.get("guidance", "Follow up with healthcare provider")
                next_check_in = triage_result.get("nextCheckInISO")
                entry_id = triage_result.get("entryId")
                
                # Map risk to urgency for other agents
                urgency = self._map_risk_to_urgency(risk_level)
                specialty = self._determine_specialty(symptoms)
                
                # Format for A2A sharing with other agents
                agent_result = {
                    "agent": "TriageAgent",
                    "task_completed": "analyze_symptoms",
                    "result": {
                        # Core triage data
                        "risk_level": risk_level,
                        "urgency": urgency,
                        "guidance": guidance,
                        "next_check_in": next_check_in,
                        "entry_id": entry_id,
                        
                        # Enhanced data for other agents
                        "specialty_needed": specialty,
                        "patient_id": str(user_id),
                        "symptoms_summary": self._summarize_symptoms(symptoms),
                        "care_level": self._determine_care_level(risk_level, urgency),
                        "priority_score": self._calculate_priority_score(risk_level, symptoms, vitals),
                        
                        # Medical context
                        "medical_reasoning": f"Risk assessment: {risk_level} based on symptom analysis",
                        "red_flags": self._identify_red_flags(symptoms, vitals),
                        "follow_up_needed": risk_level in ["medium", "high"]
                    },
                    "share_with": ["AppointmentAgent", "InsuranceAgent"],
                    "status": "success",
                    "timestamp": self._get_timestamp()
                }
                
                return agent_result
                
            else:
                # Handle HTTP errors
                error_detail = ""
                try:
                    error_data = response.json()
                    error_detail = error_data.get("detail", "Unknown error")
                except:
                    error_detail = response.text[:200] if response.text else "No error details"
                
                return {
                    "agent": "TriageAgent",
                    "error": f"Triage endpoint failed: HTTP {response.status_code}",
                    "error_detail": error_detail,
                    "status": "error",
                    "fallback_result": self._fallback_triage(symptoms, vitals)
                }
                
        except requests.exceptions.Timeout:
            return {
                "agent": "TriageAgent",
                "error": "Triage endpoint timeout (>15s)",
                "status": "error", 
                "fallback_result": self._fallback_triage(symptoms, vitals)
            }
        except requests.exceptions.ConnectionError:
            return {
                "agent": "TriageAgent",
                "error": f"Cannot connect to triage service at {self.fastapi_url}",
                "status": "error",
                "fallback_result": self._fallback_triage(symptoms, vitals)
            }
        except Exception as e:
            return {
                "agent": "TriageAgent",
                "error": f"Unexpected error during triage: {str(e)}",
                "status": "error",
                "traceback": traceback.format_exc(),
                "fallback_result": self._fallback_triage(symptoms, vitals)
            }
    
    def _fallback_triage(self, symptoms: str, vitals: Dict) -> Dict[str, Any]:
        """Fallback triage logic if main endpoint fails"""
        s = symptoms.lower()
        
        # Simple fallback rules based on your heuristic_triage logic
        if any(keyword in s for keyword in ["chest pain", "trouble breathing", "shortness of breath", "fainting", "stroke"]):
            risk = "high"
            urgency = "immediate" 
            guidance = "Seek immediate emergency care"
        elif any(keyword in s for keyword in ["severe", "worsening", "unbearable", "vomit", "dizzy"]):
            risk = "medium"
            urgency = "24_hours"
            guidance = "Seek urgent care within 24 hours"
        else:
            risk = "low"
            urgency = "1_week"
            guidance = "Monitor symptoms and seek routine care"
        
        return {
            "risk_level": risk,
            "urgency": urgency,
            "guidance": guidance,
            "specialty_needed": self._determine_specialty(symptoms),
            "fallback_used": True
        }
    
    def _map_risk_to_urgency(self, risk_level: str) -> str:
        """Convert risk level to urgency timeline for other agents"""
        mapping = {
            "high": "immediate",      # Emergency care needed now
            "medium": "24_hours",     # Urgent care within day
            "low": "1_week"          # Routine care within week
        }
        return mapping.get(risk_level, "24_hours")
    
    def _determine_specialty(self, symptoms: str) -> str:
        """Determine medical specialty based on symptoms"""
        s = symptoms.lower()
        
        # Cardiac symptoms
        if any(word in s for word in ["chest pain", "heart", "cardiac", "chest tightness", "palpitations"]):
            return "cardiology"
        
        # Respiratory symptoms  
        elif any(word in s for word in ["breathing", "shortness of breath", "asthma", "respiratory", "cough"]):
            return "pulmonology"
        
        # Neurological symptoms
        elif any(word in s for word in ["headache", "migraine", "neurological", "seizure", "stroke", "dizziness"]):
            return "neurology"
        
        # Orthopedic symptoms
        elif any(word in s for word in ["injury", "broken", "fracture", "sprain", "joint", "back pain"]):
            return "orthopedics"
        
        # Infectious/general symptoms
        elif any(word in s for word in ["fever", "infection", "flu", "cold", "nausea"]):
            return "primary_care"
        
        # Gastrointestinal
        elif any(word in s for word in ["stomach", "abdominal", "digestive", "vomiting"]):
            return "gastroenterology"
        
        else:
            return "general_medicine"
    
    def _summarize_symptoms(self, symptoms: str) -> str:
        """Create concise symptom summary for other agents"""
        if len(symptoms) <= 50:
            return symptoms
        return symptoms[:50] + "..."
    
    def _determine_care_level(self, risk_level: str, urgency: str) -> str:
        """Determine appropriate care level"""
        if risk_level == "high" or urgency == "immediate":
            return "emergency_care"
        elif risk_level == "medium" or urgency == "24_hours":
            return "urgent_care"
        else:
            return "primary_care"
    
    def _calculate_priority_score(self, risk_level: str, symptoms: str, vitals: Dict) -> int:
        """Calculate numeric priority score (1-10) for scheduling"""
        base_scores = {"high": 8, "medium": 5, "low": 2}
        score = base_scores.get(risk_level, 3)
        
        # Adjust for vital signs
        try:
            temp = float(vitals.get("temp", 0))
            if temp >= 103:
                score += 2
            elif temp >= 101:
                score += 1
        except:
            pass
        
        # Adjust for symptom severity keywords
        s = symptoms.lower()
        if any(word in s for word in ["severe", "unbearable", "emergency"]):
            score += 1
        
        return min(score, 10)  # Cap at 10
    
    def _identify_red_flags(self, symptoms: str, vitals: Dict) -> list:
        """Identify red flag symptoms that need immediate attention"""
        s = symptoms.lower()
        red_flags = []
        
        if "chest pain" in s:
            red_flags.append("chest_pain")
        if any(word in s for word in ["shortness of breath", "trouble breathing"]):
            red_flags.append("respiratory_distress")
        if "stroke" in s or "paralysis" in s:
            red_flags.append("neurological_emergency")
        if "fainting" in s or "unconscious" in s:
            red_flags.append("altered_consciousness")
        
        # Check vitals
        try:
            temp = float(vitals.get("temp", 0))
            if temp >= 103:
                red_flags.append("high_fever")
        except:
            pass
        
        return red_flags
    
    def _get_timestamp(self) -> str:
        """Get current timestamp for logging"""
        from datetime import datetime
        return datetime.utcnow().isoformat() + "Z"

# Test the agent
if __name__ == "__main__":
    agent = TriageAgent()
    
    # Test cases
    test_cases = [
        {
            "task": "analyze_symptoms",
            "data": {
                "symptoms": "I have severe chest pain and shortness of breath",
                "user_id": "test123",
                "vitals": {"temp": 99.1}
            }
        },
        {
            "task": "analyze_symptoms", 
            "data": {
                "symptoms": "Mild headache and fatigue",
                "user_id": "test456",
                "vitals": {}
            }
        }
    ]
    
    for i, test_case in enumerate(test_cases):
        print(f"\n🏥 TRIAGE AGENT TEST {i+1}:")
        result = asyncio.run(agent.handle_request(test_case))
        print(json.dumps(result, indent=2))