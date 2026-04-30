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
from services.drilldown_engine import get_drilldown_data
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
