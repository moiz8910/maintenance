import sqlite3
import os

db_path = os.path.join("backend", "maintenance.db")
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

work_order_id = 'WO-0072'
cursor.execute("SELECT * FROM work_order WHERE id = ?", (work_order_id,))
rows = [dict(r) for r in cursor.fetchall()]
print(f"Rows for {work_order_id}: {rows}")

conn.close()
