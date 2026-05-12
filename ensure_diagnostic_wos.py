"""
ensure_diagnostic_wos.py
-------------------------
Ensures that 5-7% of all work orders are Breakdown or Corrective type 
and have the status 'Diagnostic' (awaiting AI analysis).

Logic:
1. Identify Breakdown/Corrective WOs.
2. If total Breakdown/Corrective in 'Diagnostic' status < 6% of total WOs:
   - Promote some Breakdown/Corrective WOs from Closed or other statuses to 'Diagnostic'.
   - Clear their existing tasks (since they need new diagnosis).
"""
import sqlite3
import random
from datetime import datetime, timedelta

DB_PATH = "backend/maintenance.db"
TARGET_RATIO = 0.06  # 6% target
TODAY = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

def ensure_diagnostic():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 1. Get total counts
    cursor.execute("SELECT COUNT(*) FROM work_order")
    total = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM work_order WHERE work_order_status = 'Diagnostic'")
    current_diag = cursor.fetchone()[0]

    target_count = max(int(total * TARGET_RATIO), 2)
    needed = max(0, target_count - current_diag)

    print(f"Total WOs: {total} | Diagnostic: {current_diag} ({ (current_diag/total)*100 if total else 0:.1f}%)")
    print(f"Target: {target_count} ({TARGET_RATIO*100:.0f}%) | Needed: {needed}")

    if needed == 0:
        print("[OK] Diagnostic queue is sufficient.")
        conn.close()
        return

    # 2. Find candidates (Breakdown or Corrective that are NOT already in Diagnostic)
    # We prioritize those that have no tasks or are currently Closed
    cursor.execute("""
        SELECT id, work_order_status, repair_type FROM work_order
        WHERE work_order_status != 'Diagnostic'
        AND (repair_type LIKE '%Breakdown%' OR repair_type LIKE '%Corrective%')
        ORDER BY 
            CASE work_order_status 
                WHEN 'Closed' THEN 1 
                WHEN 'Approved' THEN 2
                ELSE 3 
            END
        LIMIT ?
    """, (needed,))
    candidates = [dict(r) for r in cursor.fetchall()]

    if len(candidates) < needed:
        # If we still need more, we might have to convert some Preventive to Breakdown/Corrective
        more_needed = needed - len(candidates)
        cursor.execute("""
            SELECT id FROM work_order 
            WHERE work_order_status != 'Diagnostic'
            AND repair_type = 'Preventive'
            LIMIT ?
        """, (more_needed,))
        extra = [dict(r) for r in cursor.fetchall()]
        for e in extra:
            e['work_order_status'] = 'Diagnostic' # placeholder
            e['repair_type'] = random.choice(['Breakdown Maintenance', 'Corrective Maintenance'])
            candidates.append(e)

    # 3. Promote candidates to Diagnostic
    for wo in candidates:
        wo_id = wo['id']
        rep_type = wo.get('repair_type')
        if not rep_type or rep_type not in ['Breakdown Maintenance', 'Corrective Maintenance']:
            rep_type = random.choice(['Breakdown Maintenance', 'Corrective Maintenance'])
        
        # 1. Capture the existing asset_id from task items if not already on the WO
        cursor.execute("SELECT asset FROM work_order_task_item WHERE work_order = ? LIMIT 1", (wo_id,))
        asset_row = cursor.fetchone()
        asset_id = asset_row[0] if asset_row else None

        # 2. Update status, type, and preserve asset_id
        cursor.execute("""
            UPDATE work_order 
            SET work_order_status = 'Diagnostic',
                repair_type = ?,
                work_order_open_day = ?,
                asset_id = COALESCE(asset_id, ?)
            WHERE id = ?
        """, (rep_type, (TODAY - timedelta(days=1)).strftime("%d-%m-%y"), asset_id, wo_id))
        
        # 3. CLEAR existing tasks
        cursor.execute("DELETE FROM work_order_task_item WHERE work_order = ?", (wo_id,))
        
        print(f"  --> {wo_id} moved to Diagnostic (Type: {rep_type})")

    conn.commit()
    conn.close()
    print(f"Done. Added {len(candidates)} WOs to the Diagnostic Queue.")

if __name__ == "__main__":
    ensure_diagnostic()
