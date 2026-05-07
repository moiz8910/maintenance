import sqlite3
import os

db_path = os.path.join("backend", "maintenance.db")
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

work_order_id = 'WO-0072'
cursor.execute("""
    SELECT p.technician_engineer_engaged as technician_id,
           te.name as technician_name,
           te.role_designation,
           te.discipline_trade,
           te.standard_hourly_rate,
           p.technician_service_period as service_period
    FROM technician_engineer_linkage p
    JOIN work_order_task_item t ON p.work_order_task_item = t.id
    LEFT JOIN technician_engineer te ON p.technician_engineer_engaged = te.id
    WHERE t.work_order = ?
""", (work_order_id,))
manpower = [dict(r) for r in cursor.fetchall()]
print(f"Manpower for {work_order_id}: {manpower}")

conn.close()
