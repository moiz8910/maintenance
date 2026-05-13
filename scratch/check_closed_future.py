import sqlite3
conn = sqlite3.connect("backend/maintenance.db")
cursor = conn.cursor()
cursor.execute("""
    SELECT w.id, w.work_order_open_day, ti.work_order_task_item_open_day, w.work_order_status
    FROM work_order w
    JOIN work_order_task_item ti ON w.id = ti.work_order
    WHERE w.work_order_status = 'Closed'
    AND (
        substr(ti.work_order_task_item_open_day, 7, 2) || '-' || substr(ti.work_order_task_item_open_day, 4, 2) || '-' || substr(ti.work_order_task_item_open_day, 1, 2) > '26-05-11'
    )
""")
rows = cursor.fetchall()
print(f"Found {len(rows)} Closed work orders with future schedule dates.")
for row in rows:
    print(row)
conn.close()
