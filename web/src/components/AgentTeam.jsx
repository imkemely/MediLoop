import React, { useState } from 'react';

const AgentTeam = () => {
  const [symptoms, setSymptoms] = useState('');
  const [agentResults, setAgentResults] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const startAgentWorkflow = async () => {
    setLoading(true);
    setAgentResults(null);
    
    try {
      // Simulate AI team workflow
      const triageResult = await simulateTriageAgent(symptoms);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const appointmentResult = await simulateAppointmentAgent(triageResult);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const insuranceResult = await simulateInsuranceAgent(appointmentResult);
      
      setAgentResults({
        triage: triageResult,
        appointment: appointmentResult,
        insurance: insuranceResult
      });
    } catch (error) {
      console.error('Agent workflow failed:', error);
    }
    setLoading(false);
  };
  
  return (
    <div style={{ margin: '20px 0', padding: '20px', border: '2px solid #14b8a6', borderRadius: '12px' }}>
      <h3>🤖 AI Healthcare Team</h3>
      <p>Watch our agents collaborate to coordinate your care</p>
      
      <textarea
        value={symptoms}
        onChange={(e) => setSymptoms(e.target.value)}
        placeholder="Describe your symptoms..."
        rows={3}
        style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px' }}
      />
      
      <button 
        onClick={startAgentWorkflow}
        disabled={!symptoms || loading}
        style={{ 
          padding: '10px 20px',
          backgroundColor: '#14b8a6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'wait' : 'pointer'
        }}
      >
        {loading ? 'AI Team Working...' : 'Start AI Team'}
      </button>
      
      {loading && <AgentProgress />}
      {agentResults && <AgentResults results={agentResults} />}
    </div>
  );
};

const AgentProgress = () => (
  <div style={{ margin: '20px 0' }}>
    <div>🏥 Triage Agent analyzing symptoms...</div>
    <div>📅 Appointment Agent finding care...</div>
    <div>💳 Insurance Agent checking coverage...</div>
  </div>
);

const AgentResults = ({ results }) => (
  <div style={{ marginTop: '20px' }}>
    <h4>Agent Collaboration Results:</h4>
    <div style={{ display: 'grid', gap: '10px' }}>
      <div style={{ padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
        <strong>Triage Agent:</strong> {results.triage.urgency} urgency
      </div>
      <div style={{ padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
        <strong>Appointment Agent:</strong> {results.appointment.provider_type}
      </div>
      <div style={{ padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
        <strong>Insurance Agent:</strong> Coverage verified
      </div>
    </div>
  </div>
);

// Simulate agent calls (replace with real API calls later)
const simulateTriageAgent = async (symptoms) => ({
  urgency: symptoms.includes('chest') ? '24_hours' : '1_week',
  risk_level: 'medium'
});

const simulateAppointmentAgent = async (triageData) => ({
  provider_type: 'urgent_care',
  estimated_wait: '4-24 hours'
});

const simulateInsuranceAgent = async (appointmentData) => ({
  coverage: 'verified',
  copay: '$75'
});

export default AgentTeam;