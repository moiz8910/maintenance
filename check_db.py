import sqlite3
import os

db_path = "backend/maintenance.db"
if not os.path.exists(db_path):
    print(f"Database {db_path} not found.")
    exit(1)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("Checking Pending Work Orders...")
cursor.execute("SELECT count(*) as count FROM work_order WHERE LOWER(work_order_status) = 'pending'")
print(f"Pending Work Orders: {cursor.fetchone()['count']}")

print("\nChecking Schedule Query...")
query = """
    SELECT 
        w.id as work_order_id,
        w.repair_description as description,
        wt.id as task_id,
        wt.work_order_task_item_open_day as date,
        wt.work_order_task_item_open_time as start_time,
        wt.work_order_task_item_finish_time as end_time,
        te.id as technician_id,
        te.name as technician_name,
        te.role_designation
    FROM work_order w
    JOIN work_order_task_item wt ON w.id = wt.work_order
    LEFT JOIN technician_engineer_linkage tel ON wt.id = tel.work_order_task_item
    LEFT JOIN technician_engineer te ON tel.technician_engineer_engaged = te.id
    WHERE LOWER(w.work_order_status) = 'pending'
    LIMIT 5
"""
cursor.execute(query)
rows = cursor.fetchall()
print(f"Schedule Rows found: {len(rows)}")
for row in rows:
    print(dict(row))

conn.close()
