import sqlite3
conn = sqlite3.connect("backend/maintenance.db")
cursor = conn.cursor()
cursor.execute("SELECT id, work_order_open_day, work_order_status FROM work_order WHERE work_order_status = 'Closed' LIMIT 10")
for row in cursor.fetchall():
    print(row)
conn.close()
