import json
from google import genai
import os

def run_autopilot_logic(client, kpis):
    """
    Analyzes the current KPIs and generates a maintenance strategy using Gemini.
    """
    print("[Stage 10] Maintenance Auto-Pilot: Analyzing Plant Health...")
    
    # Prepare the context for Gemini
    kpi_summary = "\n".join([f"- {kpi['name']}: {kpi['value']} ({kpi['status']})" for kpi in kpis])
    
    prompt = f"""
    You are the Maintenance Auto-Pilot Agent for a large industrial plant.
    Your goal is to ensure 100% reliability and zero unplanned downtime.
    
    Current Plant KPIs:
    {kpi_summary}
    
    Based on these metrics:
    1. Identify the top 2 critical risks.
    2. Suggest immediate corrective actions for those risks.
    3. Propose a long-term strategy to improve MTBF (Mean Time Between Failures).
    
    Format your response as a professional, actionable maintenance report. Use bullet points and bold text for key insights.
    Keep it concise but technical.
    """
    
    print("[Stage 11] Maintenance Auto-Pilot: Generating Execution Strategy...")
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text
    except Exception as e:
        print(f"Error in Auto-Pilot Agent: {e}")
        return "The Auto-Pilot Agent encountered an error while generating the strategy. Please check system logs."
