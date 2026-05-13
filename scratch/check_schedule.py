import sqlite3
import os

db_path = "backend/maintenance.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

wo_id = 'WO-0003'
print(f"--- Schedule for {wo_id} ---")
cursor.execute("SELECT id, work_order_task_item_open_day FROM work_order_task_item WHERE work_order = ?", (wo_id,))
tasks = cursor.fetchall()
for t in tasks:
    print(f"Task ID: {t['id']} | Schedule Date: {t['work_order_task_item_open_day']}")

conn.close()
