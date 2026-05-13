import sqlite3
conn = sqlite3.connect('backend/maintenance.db')
cursor = conn.cursor()
cursor.execute("SELECT id, work_order_status FROM work_order WHERE id IN ('WO-0065', 'WO-0072')")
print(cursor.fetchall())
conn.close()
