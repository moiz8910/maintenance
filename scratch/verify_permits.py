import sqlite3
import os

db_path = os.path.join("backend", "maintenance.db")
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Get a closed work order
cursor.execute("SELECT id, work_order_open_time FROM work_order WHERE work_order_status = 'Closed' LIMIT 1")
wo = cursor.fetchone()

if wo:
    wid = wo['id']
    wo_open = wo['work_order_open_time']
    print(f"Work Order: {wid}, Opened: {wo_open}")
    
    # Get first task open time
    cursor.execute("SELECT work_order_task_item_open_time FROM work_order_task_item WHERE work_order = ? ORDER BY work_order_task_item_open_time ASC LIMIT 1", (wid,))
    task = cursor.fetchone()
    task_open = task['work_order_task_item_open_time'] if task else "N/A"
    print(f"First Task Open: {task_open}")
    
    # Get permit status and timestamp
    cursor.execute("SELECT status, status_change_timestamp FROM work_permit WHERE work_order_task_item IN (SELECT id FROM work_order_task_item WHERE work_order = ?) LIMIT 1", (wid,))
    permit = cursor.fetchone()
    if permit:
        print(f"Permit Status: {permit['status']}, Timestamp: {permit['status_change_timestamp']}")
    else:
        print("No permit found for this WO.")
else:
    print("No closed work orders found.")

conn.close()
