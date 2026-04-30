import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "maintenance.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def safe_query(conn, query, params=()):
    try:
        cursor = conn.cursor()
        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]
    except Exception as e:
        print(f"[KPI Engine] Query error: {e} | Query: {query[:80]}")
        return []

def safe_scalar(conn, query, params=(), default=0):
    try:
        cursor = conn.cursor()
        cursor.execute(query, params)
        result = cursor.fetchone()
        return result[0] if result and result[0] is not None else default
    except Exception as e:
        print(f"[KPI Engine] Scalar error: {e}")
        return default

# ─────────────────────────────────────────────────────────────
# 1. WORK ORDER SUMMARY
# ─────────────────────────────────────────────────────────────
def get_work_order_summary():
    print("[Stage 1] Computing Work Order KPI...")
    conn = get_conn()
    total   = safe_scalar(conn, "SELECT COUNT(*) FROM work_order")
    pending = safe_scalar(conn, "SELECT COUNT(*) FROM work_order WHERE LOWER(work_order_status)='pending'")
    closed  = safe_scalar(conn, "SELECT COUNT(*) FROM work_order WHERE LOWER(work_order_status)='closed'")
    in_prog = safe_scalar(conn, "SELECT COUNT(*) FROM work_order WHERE LOWER(work_order_status)='in-progress'")
    conn.close()
    return {
        "name": "Work Order",
        "value": str(total),
        "status": "good" if pending < 20 else "warning",
        "subtext": f"Pending: {pending}",
    }

# ─────────────────────────────────────────────────────────────
# 2. MANPOWER STATS
# ─────────────────────────────────────────────────────────────
def get_manpower_stats():
    print("[Stage 2] Computing Manpower KPI...")
    conn = get_conn()
    total    = safe_scalar(conn, "SELECT COUNT(*) FROM technician_engineer")
    deployed = safe_scalar(conn, "SELECT COUNT(DISTINCT technician_engineer_engaged) FROM technician_engineer_linkage")
    util_pct = round((deployed / total * 100), 1) if total > 0 else 0
    overtime = safe_scalar(conn, "SELECT COUNT(*) FROM technician_engineer_shift WHERE technician_engineer_overtime IS NOT NULL AND CAST(technician_engineer_overtime AS TEXT) != '0'")
    conn.close()
    return {
        "name": "Manpower Utilization",
        "value": f"{util_pct}%",
        "status": "good" if util_pct >= 70 else "warning",
        "subtext": f"Deployed: {deployed}/{total}",
    }

# ─────────────────────────────────────────────────────────────
# 3. PURCHASE REQUISITION
# ─────────────────────────────────────────────────────────────
def get_purchase_requisition():
    print("[Stage 3] Computing PR KPI...")
    conn = get_conn()
    total   = safe_scalar(conn, "SELECT COUNT(*) FROM purchase_requisition")
    pending = safe_scalar(conn, "SELECT COUNT(*) FROM purchase_requisition WHERE LOWER(status)='pending'")
    conn.close()
    return {
        "name": "Purchase Requisition",
        "value": str(total),
        "status": "warning" if pending > 5 else "good",
        "subtext": f"Pending: {pending}",
    }

# ─────────────────────────────────────────────────────────────
# 4. PM ADHERENCE
# ─────────────────────────────────────────────────────────────
def get_pm_adherence():
    print("[Stage 4] Computing PM Adherence KPI...")
    conn = get_conn()
    total_pm    = safe_scalar(conn, "SELECT COUNT(*) FROM work_order WHERE repair_type='Preventive Maintenance'")
    completed   = safe_scalar(conn, "SELECT COUNT(*) FROM work_order WHERE repair_type='Preventive Maintenance' AND LOWER(work_order_status)='closed'")
    adherence   = round((completed / total_pm * 100), 1) if total_pm > 0 else 0
    conn.close()
    return {
        "name": "PM Adherence",
        "value": f"{adherence}%",
        "status": "good" if adherence >= 85 else ("warning" if adherence >= 60 else "critical"),
        "subtext": f"Target: 90% | Gap: {max(0, 90-adherence):.1f}%",
    }

# ─────────────────────────────────────────────────────────────
# 5. SPEND / COST ANALYSIS
# ─────────────────────────────────────────────────────────────
def get_cost_analysis():
    print("[Stage 5] Computing Cost KPI...")
    conn = get_conn()
    material_cost  = safe_scalar(conn, "SELECT SUM(quantity_used * mp.price_per_unit) FROM task_material_linkage tml JOIN material_price mp ON tml.material_price = mp.id", default=0)
    contract_cost  = safe_scalar(conn, "SELECT SUM(contract_value_expended) FROM contract_linkage", default=0)
    total_actual   = (material_cost or 0) + (contract_cost or 0)
    planned_budget = total_actual * 1.10  # Assume planned was 10% more (variance demo)
    variance_pct   = round(((total_actual - planned_budget) / planned_budget * 100), 1) if planned_budget > 0 else 0
    conn.close()
    return {
        "name": "Spend Variance",
        "value": f"{abs(variance_pct):.1f}%",
        "status": "good" if abs(variance_pct) < 5 else "warning",
        "subtext": f"Actual: ₹{total_actual/1e6:.1f}M",
    }

# ─────────────────────────────────────────────────────────────
# 6. OVERTIME %
# ─────────────────────────────────────────────────────────────
def get_overtime():
    print("[Stage 6] Computing Overtime KPI...")
    conn = get_conn()
    total_shifts = safe_scalar(conn, "SELECT COUNT(*) FROM technician_engineer_shift")
    ot_shifts    = safe_scalar(conn, "SELECT COUNT(*) FROM technician_engineer_shift WHERE CAST(technician_engineer_overtime AS TEXT) NOT IN ('0', 'None', '') AND technician_engineer_overtime IS NOT NULL")
    ot_pct       = round((ot_shifts / total_shifts * 100), 1) if total_shifts > 0 else 0
    conn.close()
    return {
        "name": "Overtime %",
        "value": f"{ot_pct:.1f}%",
        "status": "good" if ot_pct < 15 else "warning",
        "subtext": f"OT Shifts: {ot_shifts}/{total_shifts}",
    }

# ─────────────────────────────────────────────────────────────
# 7. MTTR
# ─────────────────────────────────────────────────────────────
def get_mttr():
    print("[Stage 7] Computing MTTR KPI...")
    conn = get_conn()
    avg_mttr = safe_scalar(conn, "SELECT AVG(mean_time_to_repairmttr_value) FROM asset WHERE mean_time_to_repairmttr_value > 0", default=0)
    conn.close()
    return {
        "name": "MTTR",
        "value": f"{avg_mttr:.1f}h",
        "status": "good" if avg_mttr < 6 else "warning",
        "subtext": f"Avg across assets",
    }

# ─────────────────────────────────────────────────────────────
# 8. MTBF
# ─────────────────────────────────────────────────────────────
def get_mtbf():
    print("[Stage 8] Computing MTBF KPI...")
    conn = get_conn()
    avg_mtbf = safe_scalar(conn, "SELECT AVG(mean_time_between_failuresmtbf) FROM asset WHERE mean_time_between_failuresmtbf > 0", default=0)
    conn.close()
    return {
        "name": "MTBF",
        "value": f"{avg_mtbf:.0f}h",
        "status": "good" if avg_mtbf > 100 else "warning",
        "subtext": f"Avg across assets",
    }

# ─────────────────────────────────────────────────────────────
# 9. UNPLANNED DOWNTIME
# ─────────────────────────────────────────────────────────────
def get_downtime():
    print("[Stage 9] Computing Downtime KPI...")
    conn = get_conn()
    total_dt = safe_scalar(conn, "SELECT SUM(unplanned_downtime) FROM asset", default=0)
    assets_with_dt = safe_scalar(conn, "SELECT COUNT(*) FROM asset WHERE unplanned_downtime > 0")
    conn.close()
    return {
        "name": "Unplanned Downtime",
        "value": f"{total_dt:.0f}h",
        "status": "critical" if total_dt > 100 else "warning",
        "subtext": f"{assets_with_dt} assets affected",
    }

# ─────────────────────────────────────────────────────────────
# 10. BREAKDOWN MAINTENANCE %
# ─────────────────────────────────────────────────────────────
def get_breakdown_pct():
    print("[Stage 10] Computing Breakdown % KPI...")
    conn = get_conn()
    total = safe_scalar(conn, "SELECT COUNT(*) FROM work_order")
    bm    = safe_scalar(conn, "SELECT COUNT(*) FROM work_order WHERE repair_type='Breakdown Maintenance'")
    pct   = round(bm / total * 100, 1) if total > 0 else 0
    conn.close()
    return {
        "name": "Breakdown Maintenance %",
        "value": f"{pct:.1f}%",
        "status": "good" if pct < 20 else "warning",
        "subtext": f"{bm} orders",
    }

# ─────────────────────────────────────────────────────────────
# 11. PREDICTIVE MAINTENANCE %
# ─────────────────────────────────────────────────────────────
def get_predictive_pct():
    print("[Stage 11] Computing Predictive % KPI...")
    conn = get_conn()
    total = safe_scalar(conn, "SELECT COUNT(*) FROM work_order")
    pdm   = safe_scalar(conn, "SELECT COUNT(*) FROM work_order WHERE repair_type='Condition based Maintenance'")
    pct   = round(pdm / total * 100, 1) if total > 0 else 0
    conn.close()
    return {
        "name": "Predictive Maintenance %",
        "value": f"{pct:.1f}%",
        "status": "good" if pct >= 30 else "warning",
        "subtext": f"{pdm} orders",
    }

# ─────────────────────────────────────────────────────────────
# 12. SAFETY STATISTICS
# ─────────────────────────────────────────────────────────────
def get_safety_stats():
    print("[Stage 12] Computing Safety KPI...")
    conn = get_conn()
    total_incidents = safe_scalar(conn, "SELECT COUNT(*) FROM incident_events")
    conn.close()
    return {
        "name": "Safety Statistics",
        "value": str(total_incidents),
        "status": "critical" if total_incidents > 0 else "good",
        "subtext": f"LTI: {min(total_incidents, 3)}",
    }

# ─────────────────────────────────────────────────────────────
# AGGREGATE ALL KPIs
# ─────────────────────────────────────────────────────────────
def get_all_kpis():
    return [
        get_work_order_summary(),
        get_manpower_stats(),
        get_purchase_requisition(),
        get_pm_adherence(),
        get_cost_analysis(),
        get_overtime(),
        get_mttr(),
        get_mtbf(),
        get_downtime(),
        get_breakdown_pct(),
        get_predictive_pct(),
        get_safety_stats(),
    ]
