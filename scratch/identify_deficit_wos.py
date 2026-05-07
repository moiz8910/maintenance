import sqlite3

DB_PATH = "backend/maintenance.db"
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("""
    SELECT DISTINCT w.id
    FROM work_order w
    JOIN work_order_task_item woti ON woti.work_order = w.id
    JOIN task_material_linkage m ON m.work_order_task_item = woti.id
    JOIN material_master mm ON m.material_used = mm.id
    WHERE LOWER(w.work_order_status) = 'pending'
    LIMIT 2
""")
rows = cursor.fetchall()
for row in rows:
    print(row['id'])
conn.close()
