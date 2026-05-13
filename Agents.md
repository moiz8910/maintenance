# Agents.md - Maintenance Intelligence Platform Documentation

## 1. Functional Specification

The Maintenance Intelligence Platform is an AI-powered ecosystem designed for industrial asset management, specifically tailored for aluminum smelter operations. Its core functionalities include:

*   **Real-time KPI Dashboard**: Monitors critical maintenance metrics like Work Order Status, Manpower Utilization, Maintenance Spend, and PM Adherence.
*   **Intelligent Drill-down**: Allows users to click on any KPI to see detailed trends, associated work orders, and AI-generated insights.
*   **AI-Powered Execution Advice**: Generates asset-specific maintenance SOPs, safety instructions, and tool requirements using Google Gemini.
*   **Detailed Execution Planning**: Manages the assignment of personnel, materials, and contracts to work orders, supplemented by AI reasoning for each decision.
*   **Automated Work Permit Generation**: HSE-compliant permit generation (PDF/DOCX) using AI to analyze task risks and safety controls.
*   **Conflict-Aware Scheduler**: A calendar-based interface for scheduling pending work orders while respecting asset availability and resource constraints.
*   **Multi-Agent Intelligence**: A suite of specialized agents (Auto-pilot, Reliability Assistant, Business Analyst) providing strategic advice via a chat interface.
*   **Asset Health Monitoring**: Detailed tracking of asset parameters, lifecycle metrics (MTTR, MTBF), and criticality.

---

## 2. Project Structure

### Root Directory
- `.env`: Environment variables (API Keys, DB paths).
- `maintenance.db`: SQLite database containing all plant and maintenance data.
- `start_all.ps1`: PowerShell script to initialize the database and launch both servers.
- `run_servers.py`: Python script for managed startup of backend and frontend.
- `requirements.txt`: Python dependencies.

### Backend (`/backend`)
- `main.py`: FastAPI entry point and core API endpoints.
- `lookup_router.py`: API routes for data lookup (tasks, materials, technicians).
- `excel_to_sqlite.py`: Script to ingest dummy data from Excel into the database.
- `services/`: Core logic engines.
  - `agent_manager.py`: LangGraph-based agent orchestration and Gemini integration.
  - `kpi_engine.py`: Logic for computing real-time plant KPIs.
  - `drilldown_engine.py`: Data aggregation for KPI deep-dives.
  - `tools.py`: Database query tools used by the AI agents.

### Frontend (`/frontend`)
- `src/app/`: Next.js App Router pages (Dashboard, Drilldown).
- `src/components/`: React components.
  - `WorkOrderChart.tsx`: Main dashboard visualization.
  - `DrilldownView.tsx`: Contextual detail view for KPIs.
  - `ExecutionPlanModal.tsx`: Interface for managing work order resources.
  - `ExecutionAdviceModal.tsx`: Interface for AI-generated instructions.
  - `MaintenanceSchedule.tsx`: Calendar scheduling interface.
- `src/store/`: Zustand state management for global app state.

---

## 3. API End Points

### Core Metrics
- `GET /api/kpis`: Returns high-level metrics (Work Orders, Spend, Manpower).
- `GET /api/drilldown/{kpi_id}`: Returns detailed time-series or categorized data for a specific KPI.

### Work Order Management
- `GET /api/work-orders`: Returns a list of work orders (optionally filtered by status).
- `GET /api/execution-plan/{work_order_id}`: Returns tasks, manpower, and materials for a specific WO.
- `POST /api/work-order/{wo_id}/approve`: Updates WO status to "In-Progress".

### AI & Reasoning
- `POST /api/work-order/{wo_id}/execution-advice`: Generates detailed SOPs using Gemini.
- `POST /api/work-order/{wo_id}/manpower-reasoning`: AI justification for assigned personnel.
- `POST /api/work-order/{wo_id}/material-reasoning`: AI justification for selected materials.
- `POST /api/work-order/{wo_id}/contract-reasoning`: AI justification for service contracts.
- `POST /api/chat`: General conversational interface for the Maintenance Assistant.
- `POST /api/agent/workflow`: Triggers specific agent routines (e.g., "maintenance_auto_pilot").

### HSE & Documentation
- `POST /api/work-permit/{permit_id}/generate`: Generates AI permit content (hazards, controls).
- `POST /api/work-permit/{permit_id}/download-docx`: Generates and streams a Word document of the permit.

### Data Lookups
- `GET /api/lookup/tasks`: List of available maintenance tasks.
- `GET /api/lookup/technicians`: List of available personnel.
- `GET /api/lookup/materials`: List of available spare parts and inventory.

---

## 4. Details: Implementation Mapping

### 1. KPI Dashboard & Drilldown
- **Frontend**: `KPIStats.tsx` displays summaries; `DrilldownView.tsx` renders the detail modal.
- **Backend**: `kpi_engine.py` computes values from SQLite; `drilldown_engine.py` aggregates specific datasets.
- **API**: `GET /api/kpis` and `GET /api/drilldown/{kpi_id}`.

### 2. AI Execution Advice
- **Frontend**: `ExecutionAdviceModal.tsx` displays the generated Markdown.
- **Backend**: `main.py` (endpoint `/execution-advice`) constructs a prompt with WO/Asset context and calls `generate_with_retry` in `agent_manager.py`.
- **AI**: Uses Google Gemini to blend system data with industrial best practices.

### 3. Resource Reasoning (Manpower/Materials)
- **Frontend**: `ExecutionPlanModal.tsx` captures user edits and requests reasoning.
- **Backend**: `main.py` endpoints like `/manpower-reasoning` use the `agent_manager` to generate "smart" justifications based on roles and disciplines.

### 4. Work Permit Generation
- **Frontend**: Triggered via `ExecutionPlanModal.tsx`.
- **Backend**: `/work-permit/{permit_id}/generate` fetches WO details, uses Gemini/GPT-4o to identify specific hazards (Mechanical, High-temp), and outputs structured JSON.
- **Document Logic**: `download-docx` uses the `python-docx` library to map JSON content into a formatted Word template.

### 5. Multi-Agent Orchestration
- **Logic**: `agent_manager.py` uses **LangGraph** to define a state machine (Classify -> Fetch Data -> Generate).
- **Tools**: The agents use `tools.py` to query the database, ensuring the AI response is grounded in real plant data.
