import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "maintenance.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def safe_query(query, params=()):
    try:
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute(query, params)
        res = [dict(row) for row in cursor.fetchall()]
        conn.close()
        print(f"[Tool Query] {query[:50]}... -> {len(res)} results")
        return res
    except Exception as e:
        print(f"[Tool Error] {e}")
        return []

def get_all_assets():
    """Fetches a list of all assets and their basic details."""
    return safe_query("SELECT id, name, type, location, criticality FROM asset LIMIT 50")

# 1. KPI Summary
def get_kpi_summary():
    """Fetches all high-level plant KPIs."""
    return safe_query("SELECT name, value, status, subtext FROM kpis")

# 2. Work Orders
def get_work_orders(status=None):
    """Fetches work orders, optionally filtered by status."""
    if status:
        return safe_query("SELECT * FROM work_order WHERE LOWER(work_order_status) = ?", (status.lower(),))
    return safe_query("SELECT * FROM work_order LIMIT 20")

# 3. Manpower Data
def get_manpower_data():
    """Fetches technician and engineer utilization data."""
    return safe_query("""
        SELECT te.name, te.role_designation, te.discipline_trade, COUNT(tel.id) as tasks_assigned
        FROM technician_engineer te
        LEFT JOIN technician_engineer_linkage tel ON te.id = tel.technician_engineer_engaged
        GROUP BY te.id
    """)

# 4. Cost Analysis
def get_cost_analysis():
    """Fetches spending and budget data."""
    # Simplified cost aggregation
    material_costs = safe_query("SELECT SUM(quantity_used * price_per_unit) as total_material_cost FROM task_material_linkage tml JOIN material_price mp ON tml.material_price = mp.id")
    contract_costs = safe_query("SELECT SUM(contract_value_expended) as total_contract_cost FROM contract_linkage")
    return {
        "material_costs": material_costs[0]['total_material_cost'] if material_costs else 0,
        "contract_costs": contract_costs[0]['total_contract_cost'] if contract_costs else 0
    }

# 5. Downtime Analysis
def get_downtime_analysis():
    """Fetches unplanned downtime across assets."""
    return safe_query("SELECT name, location, unplanned_downtime, unplanned_downtime_uom FROM asset WHERE unplanned_downtime > 0 ORDER BY unplanned_downtime DESC")

# 6. Failure Analysis
def get_failure_analysis():
    """Fetches incident reports and lessons learnt."""
    incidents = safe_query("SELECT * FROM incident_events")
    lessons = safe_query("SELECT * FROM lesson_learnt")
    return {"incidents": incidents, "lessons_learnt": lessons}

# 7. Asset Parameter Monitoring (for Predictive)
def get_asset_parameters():
    """Fetches real-time sensor parameters for predictive maintenance."""
    return safe_query("SELECT * FROM asset_parameter WHERE parameter_actual_value > parameter_high_threshold_value OR parameter_actual_value < parameter_low_threshold_value")
