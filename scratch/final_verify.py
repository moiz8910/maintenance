import sqlite3
import os

db_path = "backend/maintenance.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

ids = ['WO-0003', 'WO-0007', 'WO-0022']
print("--- Final Verification ---")

for wo_id in ids:
    cursor.execute("SELECT id, work_order_status, work_order_open_day FROM work_order WHERE id = ?", (wo_id,))
    wo = cursor.fetchone()
    if wo:
        print(f"WO: {wo['id']} | Status: {wo['work_order_status']} | Opened: {wo['work_order_open_day']}")
        
        # Tasks
        cursor.execute("SELECT id, work_order_task_item_open_day FROM work_order_task_item WHERE work_order = ?", (wo_id,))
        tasks = cursor.fetchall()
        for t in tasks:
            print(f"  Task: {t['id']} | Scheduled: {t['work_order_task_item_open_day']}")
            
            # Materials
            cursor.execute("""
                SELECT mm.description, m.quantity_used, m.lead_time,
                       (SELECT SUM(stock_available_on_hand) FROM on_hand_inventory WHERE material = mm.id) as avail
                FROM task_material_linkage m
                JOIN material_master mm ON m.material_used = mm.id
                WHERE m.work_order_task_item = ?
            """, (t['id'],))
            mats = cursor.fetchall()
            for m in mats:
                print(f"    Mat: {m['description']} | Req: {m['quantity_used']} | Avail: {m['avail'] or 0} | LT: {m['lead_time']}")
    else:
        print(f"WO: {wo_id} NOT FOUND")

conn.close()
