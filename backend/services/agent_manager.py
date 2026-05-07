import json
import os
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from google import genai
import openai
try:
    from .tools import (
        get_kpi_summary, get_work_orders, get_manpower_data, 
        get_cost_analysis, get_downtime_analysis, get_failure_analysis,
        get_asset_parameters, get_all_assets, get_pending_work_orders_with_tasks
    )
except ImportError:
    from services.tools import (
        get_kpi_summary, get_work_orders, get_manpower_data, 
        get_cost_analysis, get_downtime_analysis, get_failure_analysis,
        get_asset_parameters, get_all_assets, get_pending_work_orders_with_tasks
    )

# Define State
class AgentState(TypedDict):
    query: str
    intent: str
    tools_data: Dict[str, Any]
    answer: str
    data_used: Dict[str, Any]
    confidence: str
    stage_logs: List[str]

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

import time

# Robust DB Path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "maintenance.db")

# Initialize Clients
MODEL_PROVIDER = os.getenv("MODEL_PROVIDER", "google").lower()
google_api_key = os.getenv("GOOGLE_API_KEY")
openai_api_key = os.getenv("OPENAI_API_KEY")

google_client = genai.Client(api_key=google_api_key) if google_api_key else None
openai_client = openai.OpenAI(api_key=openai_api_key) if openai_api_key else None

GEMINI_MODEL = "gemini-flash-latest"
OPENAI_MODEL = "gpt-4o"

def generate_with_retry(prompt, system_prompt=None, max_retries=3):
    for i in range(max_retries):
        try:
            if MODEL_PROVIDER == "openai" and openai_client:
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})
                
                response = openai_client.chat.completions.create(
                    model=OPENAI_MODEL,
                    messages=messages
                )
                return response.choices[0].message.content
            else:
                # Default to Google
                contents = [prompt]
                if system_prompt:
                    contents = [system_prompt, prompt]
                
                response = google_client.models.generate_content(
                    model=GEMINI_MODEL, 
                    contents=contents
                )
                return response.text
        except Exception as e:
            if ("503" in str(e) or "rate limit" in str(e).lower()) and i < max_retries - 1:
                time.sleep(2 * (i + 1))
                continue
            raise e

# --- Nodes ---

def classify_intent(state: AgentState):
    query = state['query'].lower()
    state['stage_logs'].append("[Stage 1] Received query")
    
    # Simple keyword heuristic as a fallback/reinforcement
    keywords = {
        "KPI": ["kpi", "performance", "stat", "metric", "overview"],
        "WORK_ORDER": ["work order", "job", "repair", "task", "pending", "status"],
        "MANPOWER": ["manpower", "crew", "technician", "engineer", "shift", "utilization"],
        "COST": ["cost", "spend", "budget", "variance", "price", "expenditure"],
        "DOWNTIME": ["downtime", "failure", "breakdown", "stop", "unplanned"],
        "FAILURE": ["incident", "lesson", "learnt", "root cause", "analysis"],
        "PREDICTIVE": ["sensor", "threshold", "predictive", "anomaly", "parameter"],
        "ASSET": ["asset", "machine", "equipment", "location", "criticality"]
    }
    
    prompt = f"""
    Classify the following maintenance query into ONE category:
    - KPI_QUERY
    - WORK_ORDER_QUERY
    - MANPOWER_QUERY
    - COST_QUERY
    - DOWNTIME_QUERY
    - FAILURE_ANALYSIS
    - PREDICTIVE
    - ASSET_QUERY
    - GENERAL
    
    Query: {query}
    Return ONLY the category name.
    """
    
    try:
        response_text = generate_with_retry(prompt=prompt)
        intent = response_text.strip().upper()
    except:
        intent = "GENERAL"
        
    # Heuristic override if LLM is too vague
    if intent == "GENERAL":
        for cat, words in keywords.items():
            if any(w in query for w in words):
                intent = f"{cat}_QUERY" if "ANALYSIS" not in cat else cat
                break

    state['intent'] = intent
    state['stage_logs'].append(f"[Stage 2] Classified intent: {intent}")
    return state

def fetch_data(state: AgentState):
    intent = state['intent']
    state['stage_logs'].append("[Stage 3] Fetching data from tools")
    
    data = {}
    
    # Intent-based fetch
    if "KPI" in intent:
        data['kpis'] = get_kpi_summary()
    if "WORK_ORDER" in intent:
        data['work_orders'] = get_work_orders()
    
    # Special: Detailed task instructions fetch
    if "instruction" in state['query'].lower() or "coach" in state['query'].lower():
        data['pending_work_orders_detailed'] = get_pending_work_orders_with_tasks()
    if "MANPOWER" in intent:
        data['manpower'] = get_manpower_data()
    if "COST" in intent:
        data['costs'] = get_cost_analysis()
    if "DOWNTIME" in intent:
        data['downtime'] = get_downtime_analysis()
    if "FAILURE" in intent:
        data['failures'] = get_failure_analysis()
    if "PREDICTIVE" in intent:
        data['sensors'] = get_asset_parameters()
    if "ASSET" in intent:
        data['assets'] = get_all_assets()
        
    # If it's a "GENERAL" or "KPI" query, also include some high-level context
    if not data or intent == "KPI_QUERY":
        data['kpis_fallback'] = get_kpi_summary()

    # Special: For agent-triggered workflows, we fetch a broader set of data
    if "Analyze" in state['query'] or "Review" in state['query']:
        data['kpis'] = get_kpi_summary()
        data['critical_downtime'] = get_downtime_analysis()
    
    state['tools_data'] = data
    
    # Debug log for data counts
    summary = ", ".join([f"{k}: {len(v) if isinstance(v, list) else 1 if v else 0}" for k, v in data.items()])
    print(f"[Agent Manager] Stage 3 complete. Data summary: {summary}")
    state['stage_logs'].append(f"[Stage 3.1] Data retrieved: {summary}")
    
    return state

def validate_and_generate(state: AgentState):
    state['stage_logs'].append("[Stage 4] Validating data grounding")
    
    # Check if we have ANY actual records in the tools_data
    has_data = False
    for key, val in state['tools_data'].items():
        if val and (isinstance(val, list) and len(val) > 0 or isinstance(val, dict) and len(val) > 0):
            has_data = True
            break

    if not has_data and state['intent'] != "GENERAL":
        state['answer'] = "I do not have sufficient data in the current system to answer this."
        state['confidence'] = "low"
        return state

    state['stage_logs'].append("[Stage 5] Generating response")
    
    context = json.dumps(state['tools_data'], indent=2)
    
    system_prompt = """
    You are a senior Industrial Maintenance AI Architect with deep expertise in Aluminum Smelter operations and general Asset Management.
    
    Your goal is to provide comprehensive insights by:
    1. PRIORITIZING the provided Context Data (Live system metrics, KPIs, Assets, etc.).
    2. BLENDING this local data with your external knowledge of industrial best practices, global benchmarks, and technical standards.
    3. If the Context Data is missing or insufficient, state that clearly but still provide general expert advice based on the query.
    
    Format your response in structured Markdown:
    - Use bullet points for lists.
    - Use tables for structured data.
    - Be technical, precise, and professional.
    """
    
    user_prompt = f"Question: {state['query']}\n\nContext Data:\n{context}"
    
    try:
        response_text = generate_with_retry(
            prompt=user_prompt,
            system_prompt=system_prompt
        )
        state['answer'] = response_text
    except Exception as e:
        print(f"[Agent Manager] AI ERROR: {e} | USING MOCK FALLBACK")
        state['answer'] = """### 🛠️ Standard Maintenance Strategy (MOCK MODE)
The AI system is currently in fallback mode due to quota limits, but here is the standard industrial guidance for this request:

#### 1. Safety & Preparation
- **Isolation:** Ensure all electrical and mechanical energy sources are locked out (LOTO).
- **PPE:** Wear standard industrial PPE (Hard hat, steel-toed boots, safety glasses, and high-temp gloves if applicable).
- **Permit:** Verify that the 'Standard Maintenance Permit' is active and signed.

#### 2. Execution Steps
- **Inspection:** Visually inspect the asset for any obvious signs of wear, leaks, or misalignment.
- **Cleaning:** Remove any debris or dust from the cooling vents and surrounding area.
- **Testing:** Perform a test run at low speed/load to verify smooth operation.
- **Reporting:** Document any anomalies found during the intervention.

#### 3. Post-Maintenance
- **Housekeeping:** Clear the work area of all tools and discarded materials.
- **Handover:** Notify the area supervisor that the asset is ready for normal operation.

*Note: This is a standard fallback response. Please verify against your local SOP documents.*"""
        state['confidence'] = "low"
        return state
    
    state['data_used'] = state['tools_data']
    state['confidence'] = "high" if state['tools_data'] else "low"
    
    return state

# --- Build Graph ---

workflow = StateGraph(AgentState)
workflow.add_node("classify", classify_intent)
workflow.add_node("fetch", fetch_data)
workflow.add_node("generate", validate_and_generate)

workflow.set_entry_point("classify")
workflow.add_edge("classify", "fetch")
workflow.add_edge("fetch", "generate")
workflow.add_edge("generate", END)

app_graph = workflow.compile()

def run_maintenance_assistant(query: str):
    initial_state = {
        "query": query,
        "intent": "",
        "tools_data": {},
        "answer": "",
        "data_used": {},
        "confidence": "medium",
        "stage_logs": []
    }
    
    final_state = app_graph.invoke(initial_state)
    return {
        "answer": final_state['answer'],
        "data_used": final_state['data_used'],
        "confidence": final_state['confidence'],
        "stage_logs": final_state['stage_logs']
    }

# --- Specific Agent Handlers ---

def run_agent_workflow(agent_id: str, query: str = ""):
    # Map agent_id to specific pre-defined queries if none provided
    agent_prompts = {
        "maintenance_auto_pilot": "Analyze all plant KPIs and generate an immediate maintenance execution strategy.",
        "asset_strategy": "Review asset health and propose a long-term maintenance schedule optimization.",
        "business_analyst": "Provide a detailed business intelligence report on current plant performance and cost variance.",
        "work_instruction_coach": "List all pending work orders. For each work order, provide detailed work instructions for EVERY task item, including safety steps and necessary tools.",
        "reliability_assistant": "Analyze downtime and failure incidents to suggest reliability improvements.",
        "asset_steward": "Provide a complete overview of asset lifecycle status and maintenance history."
    }
    
    actual_query = query if query else agent_prompts.get(agent_id, "Analyze maintenance status.")
    return run_maintenance_assistant(actual_query)
