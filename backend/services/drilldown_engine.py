import sqlite3

DB_PATH = "c:/Users/Moiz/Desktop/Maintainence/backend/maintenance.db"

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
        return res
    except Exception as e:
        print(f"[Drilldown Engine] Query error: {e}")
        return []

def get_drilldown_data(kpi_id: str):
    print(f"[Stage 5] Serving drill-down data for: {kpi_id}")
    
    if kpi_id == "work-order":
        data = safe_query("SELECT work_order_status as name, COUNT(*) as count FROM work_order GROUP BY work_order_status")
        return {"chartType": "bar", "data": data, "title": "Work Order Status Distribution"}
        
    elif kpi_id == "manpower-utilization":
        # Grouped bar chart: Total vs Deployed by Role
        roles = safe_query("SELECT role_designation as role, COUNT(*) as total FROM technician_engineer GROUP BY role_designation")
        deployed = safe_query("""
            SELECT te.role_designation as role, COUNT(DISTINCT tel.technician_engineer_engaged) as deployed
            FROM technician_engineer te 
            JOIN technician_engineer_linkage tel ON te.id = tel.technician_engineer_engaged
            GROUP BY te.role_designation
        """)
        # Merge
        merged = []
        for r in roles:
            dep_count = next((d['deployed'] for d in deployed if d['role'] == r['role']), 0)
            merged.append({"name": r['role'], "total": r['total'], "deployed": dep_count})
        return {"chartType": "grouped-bar", "data": merged, "title": "Manpower Deployment by Role"}
        
    elif kpi_id == "purchase-requisition":
        data = safe_query("SELECT status as name, COUNT(*) as count FROM purchase_requisition GROUP BY status")
        return {"chartType": "bar", "data": data, "title": "PR Status Distribution"}
        
    elif kpi_id == "pm-adherence":
        # Mocking monthly trend based on what we have
        return {
            "chartType": "line", 
            "data": [
                {"name": "Jan", "planned": 45, "actual": 40},
                {"name": "Feb", "planned": 50, "actual": 48},
                {"name": "Mar", "planned": 40, "actual": 39},
                {"name": "Apr", "planned": 55, "actual": 51},
            ], 
            "title": "PM Planned vs Actual"
        }
        
    elif kpi_id == "spend-variance":
        return {
            "chartType": "grouped-bar", 
            "data": [
                {"name": "Materials", "plan": 500000, "actual": 505770},
                {"name": "Contracts", "plan": 45000000, "actual": 49703411},
                {"name": "Labor", "plan": 1200000, "actual": 1150000},
            ], 
            "title": "Spend Analysis (Plan vs Actual)"
        }
        
    elif kpi_id == "unplanned-downtime":
        data = safe_query("SELECT location as name, SUM(unplanned_downtime) as count FROM asset WHERE unplanned_downtime > 0 GROUP BY location")
        return {"chartType": "horizontal-bar", "data": data, "title": "Downtime by Location"}
        
    elif kpi_id == "mttr":
        data = safe_query("SELECT name as asset, mean_time_to_repairmttr_value as mttr FROM asset ORDER BY mttr DESC LIMIT 5")
        return {"chartType": "table", "data": data, "title": "Top MTTR Deviating Assets"}
        
    elif kpi_id == "mtbf":
        data = safe_query("SELECT name as asset, mean_time_between_failuresmtbf as mtbf FROM asset ORDER BY mtbf ASC LIMIT 5")
        return {"chartType": "table", "data": data, "title": "Lowest MTBF Assets"}
        
    elif kpi_id == "breakdown-maintenance-":
        # Line chart monthly trend
        return {
            "chartType": "line",
            "data": [
                {"name": "Jan", "actual": 8},
                {"name": "Feb", "actual": 5},
                {"name": "Mar", "actual": 9},
                {"name": "Apr", "actual": 4},
            ],
            "title": "Breakdown Trend (Monthly)"
        }
        
    elif kpi_id == "predictive-maintenance-":
        return {
            "chartType": "line",
            "data": [
                {"name": "Jan", "actual": 15},
                {"name": "Feb", "actual": 18},
                {"name": "Mar", "actual": 22},
                {"name": "Apr", "actual": 28},
            ],
            "title": "Predictive Maintenance Adoption"
        }
        
    elif kpi_id == "safety-statistics":
        return {
            "chartType": "bar",
            "data": [
                {"name": "Near Miss", "count": 4},
                {"name": "LTI", "count": 1},
                {"name": "First Aid", "count": 7},
            ],
            "title": "Incident Types Distribution"
        }
    
    # Fallback
    return {"chartType": "bar", "data": [{"name": "No Data", "count": 0}], "title": "Data Unavailable"}
