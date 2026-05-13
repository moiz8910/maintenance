import sqlite3
import os

db_path = os.path.join('backend', 'maintenance.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT id, work_order_status FROM work_order WHERE LOWER(work_order_status) = 'diagnostic'")
rows = cursor.fetchall()
print(f"Diagnostic Work Orders: {len(rows)}")
for row in rows:
    print(row)
conn.close()
