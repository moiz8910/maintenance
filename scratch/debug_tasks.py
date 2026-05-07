import sqlite3
import os

db_path = os.path.join("backend", "maintenance.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT COUNT(*) FROM work_order_task_item WHERE work_order = 'WO-0072'")
count = cursor.fetchone()[0]
print(f"Tasks for WO-0072: {count}")

cursor.execute("SELECT * FROM work_order_task_item WHERE work_order = 'WO-0072'")
tasks = cursor.fetchall()
print(f"Task details: {tasks}")

conn.close()
