import sqlite3
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
        conn.commit()   # persist UPDATEs / INSERTs / DELETEs
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
        deployed_roles = safe_query("""
            SELECT te.role_designation as role, COUNT(DISTINCT tel.technician_engineer_engaged) as deployed
            FROM technician_engineer te 
            JOIN technician_engineer_linkage tel ON te.id = tel.technician_engineer_engaged
            GROUP BY te.role_designation
        """)
        merged_roles = []
        for r in roles:
            dep_count = next((d['deployed'] for d in deployed_roles if d['role'] == r['role']), 0)
            merged_roles.append({"name": r['role'], "total": r['total'], "deployed": dep_count})

        # Grouped bar chart: Total vs Deployed by Discipline
        disciplines = safe_query("SELECT discipline_trade as discipline, COUNT(*) as total FROM technician_engineer GROUP BY discipline_trade")
        deployed_disciplines = safe_query("""
            SELECT te.discipline_trade as discipline, COUNT(DISTINCT tel.technician_engineer_engaged) as deployed
            FROM technician_engineer te 
            JOIN technician_engineer_linkage tel ON te.id = tel.technician_engineer_engaged
            GROUP BY te.discipline_trade
        """)
        merged_disciplines = []
        for d in disciplines:
            dep_count = next((x['deployed'] for x in deployed_disciplines if x['discipline'] == d['discipline']), 0)
            merged_disciplines.append({"name": d['discipline'], "total": d['total'], "deployed": dep_count})

        return {
            "chartType": "grouped-bar", 
            "data": merged_roles, 
            "disciplineData": merged_disciplines,
            "title": "Manpower Deployment"
        }
        
    elif kpi_id == "purchase-requisition":
        data = safe_query("SELECT status as name, COUNT(*) as count FROM purchase_requisition GROUP BY status")
        return {"chartType": "bar", "data": data, "title": "PR Status Distribution"}
        
    elif kpi_id == "pm-adherence":
        # Calculate weekly cumulative trend from April 1, 2026 to May 5, 2026
        from datetime import datetime, timedelta
        
        start_date = datetime(2026, 4, 1)
        end_date = datetime(2026, 5, 5)
        
        # Get all PMs
        all_pms = safe_query("SELECT work_order_open_day, work_order_status FROM work_order WHERE repair_type='Preventive Maintenance'")
        
        trend_data = []
        curr = start_date
        week_num = 1
        while curr <= end_date:
            # For "Weekly" trend, we show the status at the end of each 7-day period
            # or the current date if 7 days haven't passed
            target_date = min(curr + timedelta(days=6), end_date)
            
            total_due = 0
            completed = 0
            for pm in all_pms:
                try:
                    d, m, y = map(int, pm['work_order_open_day'].split('-'))
                    pm_date = datetime(2000 + y, m, d)
                    if pm_date <= target_date:
                        total_due += 1
                        if pm['work_order_status'].lower() == 'closed':
                            completed += 1
                except: continue
            
            adherence = round((completed / total_due * 100), 1) if total_due > 0 else 0
            trend_data.append({
                "name": f"Week {week_num} ({target_date.strftime('%d %b')})",
                "adherence": adherence
            })
            curr += timedelta(days=7)
            week_num += 1

        return {
            "chartType": "line", 
            "data": trend_data, 
            "title": "Weekly PM Adherence Trend (Since April 1st)"
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
        
    elif kpi_id == "overtime-":
        data = safe_query("""
            SELECT te.role_designation as name, COUNT(tes.id) as count
            FROM technician_engineer_shift tes
            JOIN technician_engineer te ON tes.technician = te.id
            WHERE CAST(tes.technician_engineer_overtime AS TEXT) NOT IN ('0', 'None', '') 
              AND tes.technician_engineer_overtime IS NOT NULL
            GROUP BY te.role_designation
        """)
        return {"chartType": "bar", "data": data, "title": "Overtime Shifts by Role"}
        
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
        
    elif kpi_id == "safety-compliance":
        data = safe_query("SELECT type as name, COUNT(*) as count FROM work_permit GROUP BY type")
        return {"chartType": "bar", "data": data, "title": "Permits Issued by Type"}
    
    # Fallback
    return {"chartType": "bar", "data": [{"name": "No Data", "count": 0}], "title": "Data Unavailable"}
