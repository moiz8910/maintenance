import sqlite3
conn = sqlite3.connect("backend/maintenance.db")
cursor = conn.cursor()
cursor.execute("SELECT work_order_status FROM work_order WHERE id = 'WO-0022'")
status = cursor.fetchone()
print(f"WO-0022 Status: {status}")

# Also check task items
cursor.execute("SELECT COUNT(*) FROM work_order_task_item WHERE work_order = 'WO-0022'")
count = cursor.fetchone()
print(f"Task Item Count: {count}")

conn.close()
