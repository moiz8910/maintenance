import sqlite3
conn = sqlite3.connect('backend/maintenance.db')
cursor = conn.cursor()
cursor.execute("""
    SELECT w.id, 
           (SELECT wp.status 
            FROM work_permit wp 
            JOIN work_order_task_item ti ON wp.work_order_task_item = ti.id 
            WHERE ti.work_order = w.id 
            LIMIT 1) as ps
    FROM work_order w 
    WHERE w.work_order_status = 'Pending'
""")
res = cursor.fetchall()
for r in res:
    print(f"{r[0]}: {r[1]}")
conn.close()
