# backend/agents/appointment_agent.py
import asyncio
import json
import requests
from typing import Dict, Any

class AppointmentAgent:
    def __init__(self, node_server_url: str = "https://mediloop.up.railway.app"):
        self.node_server_url = node_server_url
        
    async def handle_request(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Main A2A message handler"""
        task_type = message.get("task", "book_appointment")
        data = message.get("data", {})
        
        if task_type == "book_appointment":
            return await self.book_appointment(data)
        else:
            return {"error": f"Unknown task: {task_type}"}
    
    async def book_appointment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Book appointment using existing Node.js booking system"""
        
        urgency = data.get("urgency", "24_hours")
        risk_level = data.get("risk_level", "medium")
        patient_id = data.get("patient_id", "unknown")
        specialty = data.get("specialty_needed", "general_medicine")
        
        try:
            # Call your existing Node.js booking endpoint
            booking_response = requests.post(
                f"{self.node_server_url}/api/request-booking",
                json={
                    "urgency": urgency,
                    "specialty": specialty,
                    "patient_id": patient_id
                },
                timeout=10
            )
            
            # Get current system state
            state_response = requests.get(f"{self.node_server_url}/api/state", timeout=5)
            current_state = state_response.json() if state_response.status_code == 200 else {}
            
            return {
                "agent": "AppointmentAgent",
                "task_completed": "book_appointment",
                "result": {
                    "booking_status": "requested",
                    "urgency_level": urgency,
                    "risk_level": risk_level,
                    "specialty": specialty,
                    "estimated_wait": self._calculate_wait_time(urgency),
                    "booking_details": current_state.get("booking", {}),
                    "patient_id": patient_id,
                    "provider_type": self._get_provider_type(urgency),
                    "next_steps": self._generate_next_steps(urgency, risk_level)
                },
                "share_with": ["InsuranceAgent"],
                "status": "success"
            }
            
        except Exception as e:
            return {
                "agent": "AppointmentAgent",
                "error": f"Appointment booking failed: {str(e)}",
                "status": "error"
            }
    
    def _calculate_wait_time(self, urgency: str) -> str:
        wait_times = {
            "immediate": "0-2 hours",
            "24_hours": "4-24 hours", 
            "1_week": "3-7 days"
        }
        return wait_times.get(urgency, "1-3 days")
    
    def _get_provider_type(self, urgency: str) -> str:
        if urgency == "immediate":
            return "emergency_care"
        elif urgency == "24_hours":
            return "urgent_care"
        else:
            return "primary_care"
    
    def _generate_next_steps(self, urgency: str, risk_level: str) -> list:
        if urgency == "immediate":
            return [
                "Go to emergency room immediately",
                "Bring ID and insurance card",
                "Have someone drive you if possible"
            ]
        elif urgency == "24_hours":
            return [
                "Wait for appointment confirmation call",
                "Monitor symptoms closely",
                "Seek emergency care if symptoms worsen"
            ]
        else:
            return [
                "Appointment will be scheduled within week",
                "Continue current care routine",
                "Contact us if symptoms change"
            ]
    
# Test the agent
if __name__ == "__main__":
    agent = AppointmentAgent()
    test_message = {
        "task": "book_appointment",
        "data": {
            "urgency": "24_hours",
            "risk_level": "medium", 
            "patient_id": "test123",
            "specialty_needed": "primary_care"
        }
    }
    
    result = asyncio.run(agent.handle_request(test_message))
    print(json.dumps(result, indent=2))
