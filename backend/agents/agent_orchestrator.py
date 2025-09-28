# backend/agents/agent_orchestrator.py
import asyncio
import json
from typing import Dict, Any
from datetime import datetime
from .triage_agent import TriageAgent
from .Insurance_agent import InsuranceAgent
from .appointment_agent import AppointmentAgent

class A2AOrchestrator:
    """Orchestrates communication between all A2A agents"""
    
    def __init__(self, fastapi_url: str = "http://localhost:8000", node_url: str = "http://localhost:8080"):
        self.fastapi_url = fastapi_url
        self.node_url = node_url
        
        # Initialize all agents
        self.triage_agent = TriageAgent(fastapi_url)
        self.appointment_agent = AppointmentAgent(node_url)
        self.insurance_agent = InsuranceAgent(node_url)
        
        print(f"A2A Orchestrator initialized with 3 agents:")
        print(f"   Triage Agent → FastAPI: {fastapi_url}")
        print(f"   Appointment Agent → Node.js: {node_url}")
        print(f"   Insurance Agent → Node.js: {node_url}")
    
    async def coordinate_healthcare_workflow(self, symptoms: str, user_id: str, vitals: Dict = None) -> Dict[str, Any]:
        """Main A2A workflow orchestration with 3 agents"""
        
        workflow_id = f"workflow_{user_id}_{int(datetime.now().timestamp())}"
        
        workflow_result = {
            "workflow_id": workflow_id,
            "patient_id": user_id,
            "input": {
                "symptoms": symptoms,
                "vitals": vitals or {}
            },
            "agents_involved": [],
            "agent_communications": [],
            "agent_results": {},
            "final_coordination": {},
            "workflow_status": "in_progress",
            "start_time": datetime.now().isoformat()
        }
        
        try:
            # STEP 1: Triage Agent analyzes symptoms
            workflow_result["agents_involved"].append("TriageAgent")
            workflow_result["agent_communications"].append({
                "step": 1,
                "from": "Patient",
                "to": "TriageAgent",
                "message": f"Patient reports: {symptoms}",
                "action": "analyze_symptoms",
                "timestamp": datetime.now().isoformat()
            })
            
            print("Step 1: Triage Agent analyzing symptoms...")
            
            triage_message = {
                "task": "analyze_symptoms",
                "data": {
                    "symptoms": symptoms,
                    "user_id": user_id,
                    "vitals": vitals or {}
                }
            }
            
            triage_result = await self.triage_agent.handle_request(triage_message)
            workflow_result["agent_results"]["triage"] = triage_result
            
            if triage_result.get("status") != "success":
                workflow_result["workflow_status"] = "failed"
                workflow_result["error"] = "Triage analysis failed"
                return workflow_result
            
            triage_data = triage_result.get("result", {})
            
            # STEP 2: Appointment Agent books appointment (if urgent care needed)
            appointment_data = {}
            if triage_data.get("urgency") in ["immediate", "24_hours"]:
                workflow_result["agents_involved"].append("AppointmentAgent")
                workflow_result["agent_communications"].append({
                    "step": 2,
                    "from": "TriageAgent",
                    "to": "AppointmentAgent",
                    "message": f"Urgent booking needed: {triage_data.get('risk_level')} risk, {triage_data.get('urgency')} timeline",
                    "data_shared": {
                        "risk_level": triage_data.get("risk_level"),
                        "urgency": triage_data.get("urgency"),
                        "specialty_needed": triage_data.get("specialty_needed"),
                        "care_level": triage_data.get("care_level"),
                        "priority_score": triage_data.get("priority_score")
                    },
                    "action": "book_appointment",
                    "timestamp": datetime.now().isoformat()
                })
                
                print("Step 2: Appointment Agent booking urgent appointment...")
                
                appointment_message = {
                    "task": "book_appointment",
                    "data": {
                        "urgency": triage_data.get("urgency"),
                        "risk_level": triage_data.get("risk_level"),
                        "patient_id": user_id,
                        "specialty_needed": triage_data.get("specialty_needed"),
                        "care_level": triage_data.get("care_level"),
                        "priority_score": triage_data.get("priority_score")
                    }
                }
                
                appointment_result = await self.appointment_agent.handle_request(appointment_message)
                workflow_result["agent_results"]["appointment"] = appointment_result
                
                if appointment_result.get("status") == "success":
                    appointment_data = appointment_result.get("result", {})
                    print("Appointment booking completed")
                else:
                    print("Appointment booking had issues, continuing with insurance check")
            else:
                workflow_result["agent_communications"].append({
                    "step": 2,
                    "from": "TriageAgent", 
                    "to": "System",
                    "message": f"Low urgency ({triage_data.get('urgency')}) - routine scheduling recommended",
                    "action": "skip_urgent_booking",
                    "timestamp": datetime.now().isoformat()
                })
                print("Step 2: Low urgency - skipping urgent appointment booking")
            
            # STEP 3: Insurance Agent verifies coverage
            workflow_result["agents_involved"].append("InsuranceAgent")
            workflow_result["agent_communications"].append({
                "step": 3,
                "from": "AppointmentAgent" if appointment_data else "TriageAgent",
                "to": "InsuranceAgent", 
                "message": f"Verify coverage for {triage_data.get('care_level')} care" + 
                          (f" - appointment booked" if appointment_data else " - routine care planned"),
                "data_shared": {
                    "care_level": triage_data.get("care_level"),
                    "specialty_needed": triage_data.get("specialty_needed"),
                    "urgency": triage_data.get("urgency"),
                    "priority_score": triage_data.get("priority_score"),
                    "appointment_booked": bool(appointment_data),
                    "provider_type": appointment_data.get("provider_type") if appointment_data else None
                },
                "action": "verify_coverage",
                "timestamp": datetime.now().isoformat()
            })
            
            print("Step 3: Insurance Agent verifying coverage...")
            
            insurance_message = {
                "task": "verify_coverage",
                "data": {
                    "care_level": triage_data.get("care_level", "primary_care"),
                    "specialty_needed": triage_data.get("specialty_needed", "general_medicine"),
                    "patient_id": user_id,
                    "urgency": triage_data.get("urgency", "24_hours"),
                    "priority_score": triage_data.get("priority_score", 5),
                    "provider_type": appointment_data.get("provider_type") if appointment_data else "primary_care"
                }
            }
            
            insurance_result = await self.insurance_agent.handle_request(insurance_message)
            workflow_result["agent_results"]["insurance"] = insurance_result
            
            # STEP 4: Final coordination
            workflow_result["agent_communications"].append({
                "step": 4,
                "from": "All Agents",
                "to": "Orchestrator",
                "message": "All agents completed - coordinating final care plan",
                "action": "coordinate_response",
                "timestamp": datetime.now().isoformat()
            })
            
            print("Step 4: Coordinating final care plan...")
            
            # Create coordinated response
            workflow_result["final_coordination"] = await self._coordinate_final_response(
                triage_data, 
                appointment_data,
                insurance_result.get("result", {}) if insurance_result.get("status") == "success" else {}
            )
            
            workflow_result["workflow_status"] = "completed"
            workflow_result["end_time"] = datetime.now().isoformat()
            
            print("Complete healthcare workflow finished successfully!")
            return workflow_result
            
        except Exception as e:
            workflow_result["workflow_status"] = "failed"
            workflow_result["error"] = str(e)
            workflow_result["end_time"] = datetime.now().isoformat()
            print(f"Workflow failed: {e}")
            return workflow_result
    
    async def _coordinate_final_response(self, triage_data: Dict, appointment_data: Dict, insurance_data: Dict) -> Dict[str, Any]:
        """Coordinate final response from all agent data"""
        
        # Extract key information from all agents
        risk_level = triage_data.get("risk_level", "unknown")
        urgency = triage_data.get("urgency", "unknown")
        care_level = triage_data.get("care_level", "primary_care")
        specialty = triage_data.get("specialty_needed", "general_medicine")
        
        # Appointment information
        appointment_booked = bool(appointment_data)
        booking_status = appointment_data.get("booking_status") if appointment_data else "not_needed"
        estimated_wait = appointment_data.get("estimated_wait") if appointment_data else "N/A"
        provider_type = appointment_data.get("provider_type") if appointment_data else care_level
        
        # Insurance information
        cost_info = insurance_data.get("cost_analysis", {})
        coverage_info = insurance_data.get("network_status", {})
        
        # Generate comprehensive coordinated care plan
        coordinated_plan = {
            "patient_summary": {
                "condition_assessment": f"{risk_level.upper()} risk condition requiring {urgency.replace('_', ' ')} attention",
                "medical_guidance": triage_data.get("guidance", "Follow medical advice"),
                "specialty_recommendation": specialty,
                "priority_level": triage_data.get("priority_score", 5),
                "red_flags_identified": triage_data.get("red_flags", [])
            },
            
            "care_plan": {
                "recommended_care_level": care_level,
                "urgency_timeline": urgency,
                "follow_up_needed": triage_data.get("follow_up_needed", False),
                "next_check_in": triage_data.get("next_check_in"),
                "monitoring_required": risk_level in ["medium", "high"]
            },
            
            "appointment_plan": {
                "appointment_needed": urgency in ["immediate", "24_hours"],
                "booking_status": booking_status,
                "appointment_booked": appointment_booked,
                "estimated_wait": estimated_wait,
                "provider_type": provider_type,
                "recommended_providers": appointment_data.get("recommended_providers", []) if appointment_data else [],
                "preparation_required": appointment_data.get("preparation_required", {}) if appointment_data else {},
                "booking_id": appointment_data.get("booking_id") if appointment_data else None
            },
            
            "insurance_plan": {
                "coverage_verified": insurance_data.get("coverage_verified", False),
                "estimated_cost": cost_info.get("estimated_total", 0),
                "patient_cost": cost_info.get("patient_copay", 0),
                "insurance_covers": cost_info.get("insurance_covers", 0),
                "coverage_percentage": cost_info.get("coverage_percentage", "Unknown"),
                "in_network": coverage_info.get("in_network", False),
                "prior_auth_needed": insurance_data.get("prior_authorization", {}).get("required", False),
                "what_to_bring": insurance_data.get("what_to_bring", [])
            },
            
            "next_steps": self._generate_coordinated_next_steps(triage_data, appointment_data, insurance_data),
            
            "coordination_summary": self._generate_coordination_summary(risk_level, care_level, appointment_booked, cost_info),
            
            "agent_coordination": {
                "agents_used": len([x for x in [triage_data, appointment_data, insurance_data] if x]),
                "triage_recommendation": f"{risk_level} risk - {care_level} needed",
                "appointment_status": f"{'Booked' if appointment_booked else 'Routine scheduling'} - {estimated_wait}",
                "insurance_assessment": f"${cost_info.get('patient_copay', 0)} patient cost, {coverage_info.get('network_tier', 'standard')} network",
                "coordination_quality": "high" if all([triage_data, insurance_data]) else "medium",
                "workflow_completeness": "full" if appointment_data or urgency not in ["immediate", "24_hours"] else "partial"
            }
        }
        
        return coordinated_plan
    
    def _generate_coordinated_next_steps(self, triage_data: Dict, appointment_data: Dict, insurance_data: Dict) -> list:
        """Generate coordinated next steps from all agents"""
        
        steps = []
        urgency = triage_data.get("urgency", "24_hours")
        risk_level = triage_data.get("risk_level", "medium")
        appointment_booked = bool(appointment_data)
        
        # Medical priority steps from triage
        if urgency == "immediate":
            steps.append("Seek emergency care immediately")
            if appointment_booked:
                steps.append(f"Emergency appointment initiated - booking ID: {appointment_data.get('booking_id', 'N/A')}")
        elif urgency == "24_hours":
            if appointment_booked:
                steps.append(f"Urgent care appointment requested - wait time: {appointment_data.get('estimated_wait', 'TBD')}")
                steps.append("Expect confirmation call within 2 hours")
            else:
                steps.append("Schedule urgent care appointment within 24 hours")
        else:
            steps.append("Schedule routine appointment within a week")
        
        # Insurance preparation steps
        if insurance_data:
            what_to_bring = insurance_data.get("what_to_bring", [])
            if what_to_bring:
                steps.append(f"Bring to appointment: {', '.join(what_to_bring)}")
            
            cost_info = insurance_data.get("cost_analysis", {})
            if cost_info.get("patient_copay"):
                steps.append(f"Prepare for ${cost_info['patient_copay']} copay")
        
        # Risk-based monitoring steps
        if risk_level == "high":
            steps.append("Monitor symptoms closely - seek immediate care if worsening")
        
        return steps[:6]  # Limit to 6 most important steps
    
    def _generate_coordination_summary(self, risk_level: str, care_level: str, appointment_booked: bool, cost_info: Dict) -> str:
        """Generate human-readable coordination summary"""
        
        patient_cost = cost_info.get("patient_copay", 0)
        care_type = care_level.replace("_", " ").title()
        
        summary = f"{risk_level.upper()} priority case requiring {care_type}. "
        
        if appointment_booked:
            summary += "Appointment booking initiated. "
        else:
            summary += "Routine scheduling recommended. "
        
        if patient_cost:
            summary += f"Estimated patient cost: ${patient_cost}. "
        
        summary += "AI healthcare team has coordinated your complete care plan."
        
        return summary

# Test the complete orchestrator
if __name__ == "__main__":
    orchestrator = A2AOrchestrator()
    
    test_cases = [
        {
            "symptoms": "I have severe chest pain and difficulty breathing",
            "user_id": "emergency_patient_123", 
            "vitals": {"temp": 99.5}
        },
        {
            "symptoms": "Mild headache and feeling tired",
            "user_id": "routine_patient_456",
            "vitals": {"temp": 98.6}
        }
    ]
    
    async def run_tests():
        for i, test_case in enumerate(test_cases):
            print(f"\nA2A WORKFLOW TEST {i+1}:")
            print(f"Patient: {test_case['user_id']}")
            print(f"Symptoms: {test_case['symptoms']}")
            print("-" * 60)
            
            result = await orchestrator.coordinate_healthcare_workflow(
                test_case["symptoms"],
                test_case["user_id"], 
                test_case["vitals"]
            )
            
            print(f"Status: {result['workflow_status']}")
            print(f"Agents: {', '.join(result['agents_involved'])}")
            
            if result.get("final_coordination"):
                coordination = result["final_coordination"]
                print(f"Assessment: {coordination['patient_summary']['condition_assessment']}")
                print(f"Next Steps: {len(coordination['next_steps'])} actions")
                print(f"Summary: {coordination['coordination_summary']}")
            
            print("=" * 80)
    
    asyncio.run(run_tests())