import sqlite3
conn = sqlite3.connect('backend/maintenance.db')
cursor = conn.cursor()
cursor.execute("SELECT work_order_status, COUNT(*) FROM work_order GROUP BY work_order_status")
print(cursor.fetchall())
conn.close()
