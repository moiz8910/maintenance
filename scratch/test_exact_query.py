import sqlite3
import os

db_path = "backend/maintenance.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

query = """
    SELECT w.id, w.repair_description as description, w.work_order_class as class, 
           w.work_order_status as status, w.repair_type as type,
           w.asset, a.name as asset_name, w.work_order_open_day as date
    FROM work_order w
    LEFT JOIN asset a ON w.asset = a.id
    WHERE LOWER(w.work_order_status) = 'diagnostic'
    ORDER BY w.work_order_open_day DESC
"""

cursor.execute(query)
rows = [dict(r) for r in cursor.fetchall()]
print(f"Query Result: {len(rows)} items found.")
for row in rows:
    print(row)

conn.close()
