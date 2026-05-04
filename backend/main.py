import os
import json
import asyncio
import sqlite3
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic_settings import BaseSettings
from google import genai
from langgraph.graph import StateGraph, END
from dotenv import load_dotenv

# Import our custom engines
from services.kpi_engine import get_all_kpis
from services.drilldown_engine import get_drilldown_data, safe_query
from services.agent_manager import run_maintenance_assistant, run_agent_workflow

load_dotenv()

class Settings(BaseSettings):
    google_api_key: str = os.getenv("GOOGLE_API_KEY", "")
    db_path: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "maintenance.db")
    model_config = {"env_file": ".env"}

settings = Settings()

app = FastAPI(title="AI-Powered Maintenance Intelligence Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000", 
        "http://0.0.0.0:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class KPI(BaseModel):
    name: str
    value: str
    status: str
    subtext: str

class ChatRequest(BaseModel):
    message: str
    context_data: Optional[dict] = None

# Log helper
def log_stage(stage: int, message: str):
    print(f"[Stage {stage}] {message}")

# AI Client
client = genai.Client(api_key=settings.google_api_key)

# ─── ENDPOINTS ───

@app.get("/api/kpis", response_model=List[KPI])
async def get_kpis():
    log_stage(4, "Computing KPIs from real data...")
    return get_all_kpis()

@app.get("/api/drilldown/{kpi_id}")
async def get_drilldown(kpi_id: str):
    # kpi_id comes in slug-format from frontend (e.g. "work-order")
    return get_drilldown_data(kpi_id)

@app.get("/api/work-orders")
async def get_work_orders(status: Optional[str] = None):
    query = """
        SELECT w.id, w.repair_description as description, w.work_order_class as class, w.work_order_status as status,
               CASE WHEN EXISTS (SELECT 1 FROM work_order_task_item t WHERE t.work_order = w.id) THEN 1 ELSE 0 END as has_task
        FROM work_order w
    """
    if status:
        query += f" WHERE LOWER(w.work_order_status) = '{status.lower()}'"
    query += " ORDER BY has_task DESC, w.work_order_class ASC"
    return safe_query(query)

@app.get("/api/execution-plan/{work_order_id}")
async def get_execution_plan(work_order_id: str):
    tasks = safe_query("""
        SELECT wt.id, wt.task as task_ref, t.description as task_description, t.discipline,
               wt.work_order_task_item_open_day, wt.work_order_task_item_open_time,
               wt.work_order_task_item_finish_day, wt.work_order_task_item_finish_time,
               COALESCE(
                   -- Prefer technician/senior technician hours
                   (SELECT p.technician_service_period
                    FROM technician_engineer_linkage p
                    JOIN technician_engineer te ON te.id = p.technician_engineer_engaged
                    WHERE p.work_order_task_item = wt.id
                      AND LOWER(te.role_designation) IN ('technician', 'senior technician')
                    LIMIT 1),
                   -- Fallback to engineer hours
                   (SELECT p.technician_service_period
                    FROM technician_engineer_linkage p
                    JOIN technician_engineer te ON te.id = p.technician_engineer_engaged
                    WHERE p.work_order_task_item = wt.id
                    LIMIT 1),
                   -- Default 8h if no one assigned
                   8
               ) as estimated_duration_hours
        FROM work_order_task_item wt
        LEFT JOIN task t ON wt.task = t.id
        WHERE wt.work_order = ?
    """, (work_order_id,))
    
    materials = safe_query("""
        SELECT mm.description as material, m.quantity_used as recommended_quantity, m.material_price,
               COALESCE(SUM(inv.stock_available_on_hand), 0) as available_quantity
        FROM task_material_linkage m 
        JOIN work_order_task_item t ON m.work_order_task_item = t.id 
        JOIN material_master mm ON m.material_used = mm.id
        LEFT JOIN on_hand_inventory inv ON inv.material = mm.id
        WHERE t.work_order = ?
        GROUP BY mm.id, m.quantity_used, m.material_price, mm.description
    """, (work_order_id,))
    
    manpower = safe_query("""
        SELECT p.technician_engineer_engaged as technician_id,
               te.name as technician_name,
               te.role_designation,
               te.discipline_trade,
               te.standard_hourly_rate,
               p.technician_service_period as service_period
        FROM technician_engineer_linkage p
        JOIN work_order_task_item t ON p.work_order_task_item = t.id
        LEFT JOIN technician_engineer te ON p.technician_engineer_engaged = te.id
        WHERE t.work_order = ?
    """, (work_order_id,))

    # ── Business Rule: Engineer must be paired with a Technician ──────────────
    engineer_roles = {"engineer", "senior engineer"}
    technician_roles = {"technician", "senior technician"}

    has_engineer = any(
        (m.get("role_designation") or "").lower() in engineer_roles
        for m in manpower
    )
    has_technician = any(
        (m.get("role_designation") or "").lower() in technician_roles
        for m in manpower
    )

    if has_engineer and not has_technician:
        # Find the discipline of the assigned engineer
        eng = next(
            m for m in manpower
            if (m.get("role_designation") or "").lower() in engineer_roles
        )
        discipline = eng.get("discipline_trade", "")

        # Pick the first available technician from the same discipline
        auto_tech = safe_query(
            """SELECT id, name, role_designation, discipline_trade, standard_hourly_rate
               FROM technician_engineer
               WHERE discipline_trade = ? AND role_designation IN ('Technician', 'Senior Technician')
               LIMIT 1""",
            (discipline,)
        )

        if auto_tech:
            tech = auto_tech[0]
            # Technician hours must be > engineer hours
            eng_hours = eng.get("service_period", 8)
            tech_hours = round(eng_hours * 1.5)
            manpower.append({
                "technician_id": tech["id"],
                "technician_name": tech["name"],
                "role_designation": tech["role_designation"],
                "discipline_trade": tech["discipline_trade"],
                "standard_hourly_rate": tech["standard_hourly_rate"],
                "service_period": tech_hours,
                "auto_assigned": True   # flag for UI labelling
            })

    # ── Business Rule: Engineer hours must be < Technician hours ─────────────
    for entry in manpower:
        role = (entry.get("role_designation") or "").lower()
        if role in engineer_roles:
            # Find paired technician(s) in same discipline
            same_disc_techs = [
                m for m in manpower
                if (m.get("role_designation") or "").lower() in technician_roles
                and m.get("discipline_trade") == entry.get("discipline_trade")
            ]
            if same_disc_techs:
                min_tech_hours = min(t["service_period"] for t in same_disc_techs)
                if entry["service_period"] >= min_tech_hours:
                    entry["service_period"] = max(1, round(min_tech_hours * 0.6))

    # ── Sync task estimated_duration_hours to final manpower hours ────────────
    # Task duration = technician hours (if any), else engineer hours, else 8h default
    tech_hours_final = None
    eng_hours_final = None
    for m in manpower:
        role = (m.get("role_designation") or "").lower()
        if role in technician_roles:
            # Use the highest technician hours (most representative of task effort)
            if tech_hours_final is None or m["service_period"] > tech_hours_final:
                tech_hours_final = m["service_period"]
        elif role in engineer_roles:
            if eng_hours_final is None or m["service_period"] > eng_hours_final:
                eng_hours_final = m["service_period"]

    resolved_duration = tech_hours_final if tech_hours_final is not None else (eng_hours_final if eng_hours_final is not None else 8)

    for task in tasks:
        task["estimated_duration_hours"] = resolved_duration

    contracts = safe_query("""
        SELECT c.contract_engaged as contract, 
               cs.contract_type as type,
               c.contract_value_expended as recommended_value,
               cs.contract_value as total_value
        FROM contract_linkage c 
        JOIN work_order_task_item t ON c.work_order_task_item = t.id 
        JOIN contract_services cs ON c.contract_engaged = cs.id
        WHERE t.work_order = ?
    """, (work_order_id,))
    
    work_permits = safe_query("""
        SELECT wp.id, wp.description, wp.type, wp.work_permit_open_day, wp.work_permit_open_time, wp.work_permit_end_day, wp.work_permit_end_time
        FROM work_permit wp
        JOIN work_order_task_item t ON wp.work_order_task_item = t.id
        WHERE t.work_order = ?
    """, (work_order_id,))
    
    work_order = safe_query("SELECT * FROM work_order WHERE id = ?", (work_order_id,))
    wo_details = work_order[0] if work_order else {}
    
    total_manpower_cost = sum(m.get("service_period", 0) * m.get("standard_hourly_rate", 0) for m in manpower)
    total_material_cost = sum(m.get("recommended_quantity", 0) * m.get("material_price", 0) for m in materials)
    total_contract_cost = sum(c.get("recommended_value", 0) for c in contracts)
    total_cost = total_manpower_cost + total_material_cost + total_contract_cost
    
    estimated_cost = {
        "total": total_cost,
        "manpower": total_manpower_cost,
        "material": total_material_cost,
        "contract": total_contract_cost
    }
    
    return {
        "work_order": wo_details,
        "tasks": tasks,
        "materials": materials,
        "manpower": manpower,
        "contracts": contracts,
        "work_permits": work_permits,
        "estimated_cost": estimated_cost
    }

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        result = run_maintenance_assistant(request.message)
        # Log stages to terminal
        for log in result['stage_logs']:
            print(log)
        return result
    except Exception as e:
        print(f"[Chat Endpoint Error] {e}")
        return {
            "answer": f"Technical Error: {str(e)}",
            "data_used": {},
            "confidence": "low",
            "stage_logs": [f"Error: {str(e)}"]
        }

@app.post("/api/agent/{agent_id}")
async def run_agent(agent_id: str, request: ChatRequest):
    try:
        result = run_agent_workflow(agent_id, request.message)
        # Log stages to terminal
        for log in result['stage_logs']:
            print(log)
        return result
    except Exception as e:
        print(f"[Agent Endpoint Error] {e}")
        return {
            "answer": f"Technical Error: {str(e)}",
            "data_used": {},
            "confidence": "low",
            "stage_logs": [f"Error: {str(e)}"]
        }

# ─── WEBSOCKETS ───

@app.websocket("/ws/kpis")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            kpis = get_all_kpis()
            await websocket.send_text(json.dumps([k.dict() if hasattr(k, 'dict') else k for k in kpis]))
            await asyncio.sleep(10)
    except WebSocketDisconnect:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
