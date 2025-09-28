# backend/agents/agent_orchestrator.py
import asyncio
import json
from typing import Dict, Any
from datetime import datetime
from .triage_agent import TriageAgent
from .Insurance_agent import InsuranceAgent

class A2AOrchestrator:
    """Orchestrates communication between all A2A agents"""
    
    def __init__(self, fastapi_url: str = "http://localhost:8000", node_url: str = "http://localhost:8080"):
        self.fastapi_url = fastapi_url
        self.node_url = node_url
        
        # Initialize agents
        self.triage_agent = TriageAgent(fastapi_url)
        self.insurance_agent = InsuranceAgent(node_url)
        
        print(f"í´– A2A Orchestrator initialized with:")
        print(f"   í³ FastAPI: {fastapi_url}")
        print(f"   í³ Node.js: {node_url}")
    
    async def coordinate_healthcare_workflow(self, symptoms: str, user_id: str, vitals: Dict = None) -> Dict[str, Any]:
        """Main A2A workflow orchestration"""
        
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
            
            print("í¿¥ Step 1: Triage Agent analyzing symptoms...")
            
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
            
            # STEP 2: Insurance Agent verifies coverage
            workflow_result["agents_involved"].append("InsuranceAgent")
            workflow_result["agent_communications"].append({
                "step": 2,
                "from": "TriageAgent",
                "to": "InsuranceAgent", 
                "message": f"Risk: {triage_data.get('risk_level')}, Care needed: {triage_data.get('care_level')}",
                "data_shared": {
                    "risk_level": triage_data.get("risk_level"),
                    "care_level": triage_data.get("care_level"),
                    "urgency": triage_data.get("urgency"),
                    "specialty_needed": triage_data.get("specialty_needed"),
                    "priority_score": triage_data.get("priority_score")
                },
                "action": "verify_coverage",
                "timestamp": datetime.now().isoformat()
            })
            
            print("í²³ Step 2: Insurance Agent verifying coverage...")
            
            insurance_message = {
                "task": "verify_coverage",
                "data": {
                    "care_level": triage_data.get("care_level", "primary_care"),
                    "specialty_needed": triage_data.get("specialty_needed", "general_medicine"),
                    "patient_id": user_id,
                    "urgency": triage_data.get("urgency", "24_hours"),
                    "priority_score": triage_data.get("priority_score", 5)
                }
            }
            
            insurance_result = await self.insurance_agent.handle_request(insurance_message)
            workflow_result["agent_results"]["insurance"] = insurance_result
            
            # STEP 3: Final coordination
            workflow_result["agent_communications"].append({
                "step": 3,
                "from": "InsuranceAgent",
                "to": "Orchestrator",
                "message": "Coverage verified, coordinating final care plan",
                "action": "coordinate_response",
                "timestamp": datetime.now().isoformat()
            })
            
            print("í¾¯ Step 3: Coordinating final care plan...")
            
            # Create coordinated response
            workflow_result["final_coordination"] = await self._coordinate_final_response(
                triage_data, 
                insurance_result.get("result", {}) if insurance_result.get("status") == "success" else {}
            )
            
            workflow_result["workflow_status"] = "completed"
            workflow_result["end_time"] = datetime.now().isoformat()
            
            print("âœ… Healthcare workflow completed successfully!")
            return workflow_result
            
        except Exception as e:
            workflow_result["workflow_status"] = "failed"
            workflow_result["error"] = str(e)
            workflow_result["end_time"] = datetime.now().isoformat()
            print(f"âŒ Workflow failed: {e}")
            return workflow_result
    
    async def _coordinate_final_response(self, triage_data: Dict, insurance_data: Dict) -> Dict[str, Any]:
        """Coordinate final response from all agent data"""
        
        # Extract key information
        risk_level = triage_data.get("risk_level", "unknown")
        urgency = triage_data.get("urgency", "unknown")
        care_level = triage_data.get("care_level", "primary_care")
        specialty = triage_data.get("specialty_needed", "general_medicine")
        
        cost_info = insurance_data.get("cost_analysis", {})
        coverage_info = insurance_data.get("network_status", {})
        
        # Generate coordinated care plan
        coordinated_plan = {
            "patient_summary": {
                "condition_assessment": f"{risk_level.upper()} risk condition requiring {urgency.replace('_', ' ')} attention",
                "medical_guidance": triage_data.get("guidance", "Follow medical advice"),
                "specialty_recommendation": specialty,
                "priority_level": triage_data.get("priority_score", 5)
            },
            
            "care_plan": {
                "recommended_care_level": care_level,
                "urgency_timeline": urgency,
                "follow_up_needed": triage_data.get("follow_up_needed", False),
                "red_flags_identified": triage_data.get("red_flags", []),
                "next_check_in": triage_data.get("next_check_in")
            },
            
            "insurance_plan": {
                "coverage_verified": insurance_data.get("coverage_verified", False),
                "estimated_cost": cost_info.get("estimated_total", 0),
                "patient_cost": cost_info.get("patient_copay", 0),
                "insurance_covers": cost_info.get("insurance_covers", 0),
                "in_network": coverage_info.get("in_network", False),
                "prior_auth_needed": insurance_data.get("prior_authorization", {}).get("required", False)
            },
            
            "next_steps": self._generate_coordinated_next_steps(triage_data, insurance_data),
            
            "coordination_summary": self._generate_coordination_summary(risk_level, care_level, cost_info),
            
            "agent_coordination": {
                "triage_recommendation": f"{risk_level} risk - {care_level} needed",
                "insurance_assessment": f"${cost_info.get('patient_copay', 0)} patient cost, {coverage_info.get('network_tier', 'standard')} network",
                "coordination_quality": "high" if risk_level != "unknown" and cost_info else "medium"
            }
        }
        
        return coordinated_plan
    
    def _generate_coordinated_next_steps(self, triage_data: Dict, insurance_data: Dict) -> list:
        """Generate coordinated next steps from both agents"""
        
        steps = []
        urgency = triage_data.get("urgency", "24_hours")
        care_level = triage_data.get("care_level", "primary_care")
        
        # Medical next steps
        if urgency == "immediate":
            steps.append("íº¨ Seek emergency care immediately")
        elif urgency == "24_hours":
            steps.append("â° Schedule urgent care appointment within 24 hours")
        else:
            steps.append("í³… Schedule routine appointment within a week")
        
        # Insurance next steps
        if insurance_data.get("prior_authorization", {}).get("required"):
            steps.append("í³‹ Submit prior authorization request")
        
        # Preparation steps
        what_to_bring = insurance_data.get("what_to_bring", [])
        if what_to_bring:
            steps.append(f"ï¿½ï¿½ Bring: {', '.join(what_to_bring)}")
        
        # Follow-up steps
        if triage_data.get("follow_up_needed"):
            steps.append("í³± Monitor symptoms and check in as scheduled")
        
        return steps
    
    def _generate_coordination_summary(self, risk_level: str, care_level: str, cost_info: Dict) -> str:
        """Generate human-readable coordination summary"""
        
        patient_cost = cost_info.get("patient_copay", 0)
        care_type = care_level.replace("_", " ").title()
        
        summary = f"í¿¥ {risk_level.upper()} priority case requiring {care_type}. "
        summary += f"í²° Estimated patient cost: ${patient_cost}. "
        summary += "í´– AI agents have coordinated your complete care plan from triage through insurance coverage."
        
        return summary

# Test the orchestrator
if __name__ == "__main__":
    orchestrator = A2AOrchestrator()
    
    # Test cases
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
            print(f"\níº€ A2A ORCHESTRATOR TEST {i+1}:")
            print(f"Patient: {test_case['user_id']}")
            print(f"Symptoms: {test_case['symptoms']}")
            print("-" * 60)
            
            result = await orchestrator.coordinate_healthcare_workflow(
                test_case["symptoms"],
                test_case["user_id"], 
                test_case["vitals"]
            )
            
            print(f"\ní³Š WORKFLOW RESULT:")
            print(f"Status: {result['workflow_status']}")
            print(f"Agents: {', '.join(result['agents_involved'])}")
            
            if result.get("final_coordination"):
                coordination = result["final_coordination"]
                print(f"\ní¾¯ CARE PLAN:")
                print(f"Assessment: {coordination['patient_summary']['condition_assessment']}")
                print(f"Care Level: {coordination['care_plan']['recommended_care_level']}")
                print(f"Patient Cost: ${coordination['insurance_plan']['patient_cost']}")
                print(f"Next Steps: {len(coordination['next_steps'])} actions identified")
                
                print(f"\ní³‹ NEXT STEPS:")
                for step in coordination['next_steps']:
                    print(f"  â€¢ {step}")
                
                print(f"\ní´– COORDINATION SUMMARY:")
                print(f"  {coordination['coordination_summary']}")
            
            print("\n" + "="*80)
    
    # Run the tests
    asyncio.run(run_tests())



