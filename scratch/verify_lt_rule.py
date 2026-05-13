import sqlite3
import os

db_path = "backend/maintenance.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

wo_id = 'WO-0003'
print(f"--- Lead Time and Schedule for {wo_id} ---")

# Max lead time
cursor.execute("""
    SELECT MAX(m.lead_time) as max_lt
    FROM task_material_linkage m 
    JOIN work_order_task_item t ON m.work_order_task_item = t.id 
    WHERE t.work_order = ?
""", (wo_id,))
max_lt = cursor.fetchone()['max_lt']
print(f"Max Lead Time: {max_lt}")

# Schedule date
cursor.execute("SELECT work_order_task_item_open_day FROM work_order_task_item WHERE work_order = ?", (wo_id,))
tasks = cursor.fetchall()
for t in tasks:
    print(f"Schedule Date: {t['work_order_task_item_open_day']}")

conn.close()
