export const PRESETS = {
  triage: {
    label: "Triage (Risk)",
    emoji: "🩺",
    description: "Tell us your symptoms to get a friendly urgency suggestion and next steps.",
    placeholder: "e.g., Fever 101°F, sore throat, dry cough for 2 days, mild chest tightness when climbing stairs",
    example: "Fever 101°F, sore throat, dry cough for 2 days, mild chest tightness when climbing stairs",
    prompt:
      "You are a supportive health assistant for patients. Based on the symptoms, give:\n" +
      "• a LOW / MEDIUM / HIGH urgency suggestion (non-diagnostic)\n" +
      "• what to watch for\n" +
      "• home care tips\n" +
      "• when to seek care (and why)\n\nSymptoms:\n",
  },
  appointments: {
    label: "Appointments",
    emoji: "📅",
    description: "We’ll suggest an in-network provider with the soonest availability and prep a note to book.",
    placeholder: "Optional: add a short note (e.g., 'prefer mornings' or 'needs Spanish-speaking clinician').",
    example: "Prefer morning slot; Spanish-speaking helpful.",
    prompt:
      "Suggest an appointment plan: pick a provider who fits the request, note earliest available date, and provide a short booking note.\n" +
      "User preferences:\n",
  },
  insurance: {
    label: "Insurance",
    emoji: "💳",
    description: "Estimate typical out-of-pocket costs (PCP vs. urgent care vs. ER) from the plan basics.",
    placeholder: "Optional: add context (e.g., 'haven’t met deductible yet', 'HSA plan').",
    example: "Have not met deductible yet.",
    prompt:
      "Summarize expected out-of-pocket costs for common visits using plan basics. Show brief explanations.\n" +
      "User notes:\n",
  },
};
