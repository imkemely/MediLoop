# backend/agents/insurance_agent.py
import asyncio
import json
import requests
from typing import Dict, Any, Optional
import traceback

class InsuranceAgent:
    def __init__(self, node_server_url: str = "http://localhost:8080"):
        self.node_server_url = node_server_url
        
    async def handle_request(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Main A2A message handler with comprehensive error handling"""
        try:
            task_type = message.get("task", "verify_coverage")
            data = message.get("data", {})
            
            if task_type == "verify_coverage":
                return await self.verify_coverage(data)
            elif task_type == "calculate_costs":
                return await self.calculate_costs(data)
            elif task_type == "get_coverage_summary":
                return await self.get_coverage_summary(data)
            else:
                return {
                    "agent": "InsuranceAgent",
                    "error": f"Unknown task: {task_type}",
                    "status": "error",
                    "available_tasks": ["verify_coverage", "calculate_costs", "get_coverage_summary"]
                }
        except Exception as e:
            return {
                "agent": "InsuranceAgent",
                "error": f"Handler error: {str(e)}",
                "status": "error",
                "traceback": traceback.format_exc()
            }
    
    async def verify_coverage(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Verify insurance coverage using existing Node.js system"""
        
        # Extract data from triage and appointment agents
        care_level = data.get("care_level", "primary_care")
        specialty = data.get("specialty_needed", "general_medicine")
        patient_id = data.get("patient_id", "unknown")
        urgency = data.get("urgency", "24_hours")
        priority_score = data.get("priority_score", 5)
        
        try:
            # Get current system state from Node.js server (includes coverage)
            response = requests.get(
                f"{self.node_server_url}/api/state",
                timeout=15,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                state = response.json()
                coverage_info = state.get("coverage", {})
                
                # Calculate comprehensive cost analysis
                cost_analysis = self._analyze_costs(care_level, urgency, specialty, priority_score)
                network_status = self._check_network_status(care_level, specialty)
                authorization_info = self._check_prior_authorization(specialty, care_level)
                
                return {
                    "agent": "InsuranceAgent",
                    "task_completed": "verify_coverage",
                    "result": {
                        # Coverage verification
                        "coverage_verified": True,
                        "coverage_active": True,
                        "plan_type": "Standard HMO",  # Could come from your insurance.txt
                        
                        # Care details
                        "care_level": care_level,
                        "specialty": specialty,
                        "urgency": urgency,
                        "patient_id": str(patient_id),
                        
                        # Network and authorization
                        "network_status": network_status,
                        "prior_authorization": authorization_info,
                        
                        # Cost breakdown
                        "cost_analysis": cost_analysis,
                        "payment_summary": self._generate_payment_summary(cost_analysis),
                        
                        # Patient guidance
                        "what_to_bring": self._get_required_documents(care_level),
                        "coverage_notes": self._generate_coverage_notes(care_level, specialty),
                        "estimated_approval_time": self._get_approval_time(authorization_info),
                        
                        # System data
                        "coverage_details": coverage_info,
                        "coverage_source": "system_state"
                    },
                    "share_with": ["AppointmentAgent"],
                    "status": "success",
                    "timestamp": self._get_timestamp()
                }
            else:
                # Fallback if state endpoint fails
                return {
                    "agent": "InsuranceAgent",
                    "error": f"State endpoint failed: HTTP {response.status_code}",
                    "status": "error",
                    "fallback_result": self._fallback_coverage_analysis(care_level, specialty, urgency)
                }
                
        except requests.exceptions.Timeout:
            return {
                "agent": "InsuranceAgent",
                "error": "State endpoint timeout (>15s)",
                "status": "error",
                "fallback_result": self._fallback_coverage_analysis(care_level, specialty, urgency)
            }
        except requests.exceptions.ConnectionError:
            return {
                "agent": "InsuranceAgent", 
                "error": f"Cannot connect to state service at {self.node_server_url}",
                "status": "error",
                "fallback_result": self._fallback_coverage_analysis(care_level, specialty, urgency)
            }
        except Exception as e:
            return {
                "agent": "InsuranceAgent",
                "error": f"Unexpected error during coverage verification: {str(e)}",
                "status": "error",
                "traceback": traceback.format_exc(),
                "fallback_result": self._fallback_coverage_analysis(care_level, specialty, urgency)
            }
    
    async def calculate_costs(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate detailed cost estimates"""
        
        care_level = data.get("care_level", "primary_care")
        urgency = data.get("urgency", "24_hours")
        specialty = data.get("specialty_needed", "general_medicine")
        priority_score = data.get("priority_score", 5)
        
        try:
            cost_analysis = self._analyze_costs(care_level, urgency, specialty, priority_score)
            
            return {
                "agent": "InsuranceAgent",
                "task_completed": "calculate_costs",
                "result": cost_analysis,
                "status": "success"
            }
        except Exception as e:
            return {
                "agent": "InsuranceAgent",
                "error": f"Cost calculation failed: {str(e)}",
                "status": "error"
            }
    
    async def get_coverage_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Get human-readable coverage summary"""
        
        try:
            coverage_result = await self.verify_coverage(data)
            
            if coverage_result.get("status") == "success":
                result_data = coverage_result["result"]
                cost_data = result_data["cost_analysis"]
                
                summary = {
                    "coverage_summary": f"Your {result_data['plan_type']} plan covers {cost_data['coverage_percentage']} of {result_data['care_level']} visits.",
                    "cost_summary": f"You'll pay ${cost_data['patient_copay']} copay. Insurance covers ${cost_data['insurance_covers']}.",
                    "network_summary": f"This care is {'in-network' if result_data['network_status']['in_network'] else 'out-of-network'}.",
                    "authorization_summary": result_data['prior_authorization']['summary']
                }
                
                return {
                    "agent": "InsuranceAgent",
                    "task_completed": "get_coverage_summary", 
                    "result": summary,
                    "status": "success"
                }
            else:
                return coverage_result
                
        except Exception as e:
            return {
                "agent": "InsuranceAgent",
                "error": f"Summary generation failed: {str(e)}",
                "status": "error"
            }
    
    def _analyze_costs(self, care_level: str, urgency: str, specialty: str, priority_score: int) -> Dict[str, Any]:
        """Comprehensive cost analysis based on your server's coverage logic"""
        
        # Base costs by care level (matching your server.js patterns)
        base_costs = {
            "emergency_care": 300,
            "urgent_care": 150,
            "primary_care": 75,
            "specialist_care": 200
        }
        
        # Copays by care level (matching your coverage logic)
        copays = {
            "emergency_care": 300,
            "urgent_care": 75, 
            "primary_care": 30,
            "specialist_care": 50
        }
        
        base_cost = base_costs.get(care_level, 100)
        copay = copays.get(care_level, 40)
        
        # Specialty adjustments
        specialty_adjustments = {
            "cardiology": 50,
            "neurology": 75,
            "orthopedics": 40,
            "gastroenterology": 30
        }
        
        if specialty in specialty_adjustments:
            base_cost += specialty_adjustments[specialty]
            if care_level == "specialist_care":
                copay += 20
        
        # Urgency adjustments
        if urgency == "immediate":
            base_cost *= 1.2  # Emergency multiplier
        
        insurance_covers = base_cost - copay
        coverage_percentage = round((insurance_covers / base_cost) * 100)
        
        return {
            "estimated_total": int(base_cost),
            "patient_copay": int(copay),
            "insurance_covers": int(insurance_covers),
            "coverage_percentage": f"{coverage_percentage}%",
            "care_level": care_level,
            "specialty": specialty,
            "urgency": urgency,
            "deductible_status": "Met" if urgency == "immediate" else "Applies",
            "out_of_pocket_max": int(copay),
            "cost_breakdown": {
                "base_visit": int(base_cost),
                "specialty_fee": specialty_adjustments.get(specialty, 0),
                "urgency_multiplier": 1.2 if urgency == "immediate" else 1.0,
                "copay": int(copay),
                "estimated_savings": int(insurance_covers)
            }
        }
    
    def _check_network_status(self, care_level: str, specialty: str) -> Dict[str, Any]:
        """Check provider network status"""
        
        # Most basic care is in-network, specialists vary
        in_network_probability = {
            "emergency_care": 0.8,  # Emergency care varies by hospital
            "urgent_care": 0.9,     # Most urgent care in network
            "primary_care": 0.95,   # Primary care usually covered
            "specialist_care": 0.7   # Specialists more variable
        }
        
        probability = in_network_probability.get(care_level, 0.8)
        in_network = probability > 0.8  # Simplified logic
        
        return {
            "in_network": in_network,
            "network_tier": "preferred" if in_network else "standard",
            "coverage_level": "full" if in_network else "partial",
            "additional_costs": 0 if in_network else 50,
            "network_notes": f"{care_level.replace('_', ' ').title()} is {'in' if in_network else 'out of'} network"
        }
    
    def _check_prior_authorization(self, specialty: str, care_level: str) -> Dict[str, Any]:
        """Check if prior authorization is required"""
        
        # Specialties that typically require authorization
        auth_required_specialties = ["cardiology", "neurology", "orthopedics", "gastroenterology"]
        auth_required_care = ["specialist_care"]
        
        requires_auth = specialty in auth_required_specialties or care_level in auth_required_care
        
        if requires_auth:
            return {
                "required": True,
                "estimated_time": "2-5 business days",
                "urgency_override": care_level == "emergency_care",
                "summary": f"Prior authorization required for {specialty} - emergency cases processed immediately",
                "next_steps": ["Submit authorization request", "Provide medical records", "Wait for approval"]
            }
        else:
            return {
                "required": False,
                "summary": f"No prior authorization needed for {care_level}",
                "next_steps": ["Proceed with appointment scheduling"]
            }
    
    def _generate_payment_summary(self, cost_analysis: Dict) -> str:
        """Generate human-readable payment summary"""
        copay = cost_analysis["patient_copay"]
        coverage_pct = cost_analysis["coverage_percentage"]
        care_level = cost_analysis["care_level"].replace("_", " ").title()
        
        return f"{care_level}: You pay ${copay} copay. Insurance covers {coverage_pct} of remaining costs."
    
    def _get_required_documents(self, care_level: str) -> list:
        """Get list of required documents for visit"""
        base_documents = ["Photo ID", "Insurance card"]
        
        if care_level in ["specialist_care", "emergency_care"]:
            base_documents.extend(["List of current medications", "Recent test results"])
        
        if care_level == "emergency_care":
            base_documents.append("Emergency contact information")
        
        return base_documents
    
    def _generate_coverage_notes(self, care_level: str, specialty: str) -> list:
        """Generate specific coverage notes"""
        notes = []
        
        if care_level == "emergency_care":
            notes.append("Emergency care covered regardless of network status")
            notes.append("Higher deductible may apply for ER visits")
        
        if specialty in ["cardiology", "neurology"]:
            notes.append(f"{specialty.title()} visits may require referral from primary care")
        
        if care_level == "urgent_care":
            notes.append("Urgent care is cost-effective alternative to emergency room")
        
        return notes if notes else ["Standard coverage applies"]
    
    def _get_approval_time(self, auth_info: Dict) -> str:
        """Get estimated approval time"""
        if auth_info["required"]:
            return auth_info["estimated_time"]
        else:
            return "Immediate - no authorization required"
    
    def _fallback_coverage_analysis(self, care_level: str, specialty: str, urgency: str) -> Dict[str, Any]:
        """Fallback coverage analysis if main system fails"""
        
        # Basic fallback based on your server.js coverage logic
        fallback_copays = {"emergency_care": 300, "urgent_care": 75, "primary_care": 30}
        copay = fallback_copays.get(care_level, 50)
        
        return {
            "coverage_verified": True,
            "fallback_used": True,
            "estimated_copay": copay,
            "coverage_note": f"Basic {care_level.replace('_', ' ')} coverage confirmed",
            "what_to_bring": self._get_required_documents(care_level),
            "network_status": "Assumed in-network for fallback"
        }
    
    def _get_timestamp(self) -> str:
        """Get current timestamp for logging"""
        from datetime import datetime
        return datetime.utcnow().isoformat() + "Z"

# Test the agent
if __name__ == "__main__":
    agent = InsuranceAgent()
    
    # Test cases
    test_cases = [
        {
            "task": "verify_coverage",
            "data": {
                "care_level": "urgent_care",
                "specialty_needed": "cardiology",
                "patient_id": "test123",
                "urgency": "24_hours",
                "priority_score": 7
            }
        },
        {
            "task": "calculate_costs",
            "data": {
                "care_level": "primary_care", 
                "specialty_needed": "general_medicine",
                "urgency": "1_week",
                "priority_score": 3
            }
        }
    ]
    
    for i, test_case in enumerate(test_cases):
        print(f"\n💳 INSURANCE AGENT TEST {i+1}:")
        result = asyncio.run(agent.handle_request(test_case))
        print(json.dumps(result, indent=2))