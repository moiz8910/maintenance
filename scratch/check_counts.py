import sqlite3
import os

db_path = os.path.join("backend", "maintenance.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT COUNT(*) FROM work_order WHERE LOWER(work_order_status) = 'pending'")
print(f"Pending WOs: {cursor.fetchone()[0]}")

cursor.execute("""
    SELECT COUNT(*) FROM work_order_task_item ti
    JOIN work_order w ON ti.work_order = w.id
    WHERE LOWER(w.work_order_status) = 'pending'
""")
print(f"Task items for pending WOs: {cursor.fetchone()[0]}")
conn.close()
