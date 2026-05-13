import sqlite3
from datetime import datetime, timedelta
import random

db_path = "backend/maintenance.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

TODAY = datetime(2026, 5, 11)

print(f"--- Correcting Closed WO Dates (Today: {TODAY.strftime('%d-%m-%y')}) ---")

cursor.execute("SELECT id, work_order_open_day FROM work_order WHERE work_order_status = 'Closed'")
closed_wos = cursor.fetchall()

updated_count = 0
for wo in closed_wos:
    wo_id = wo['id']
    open_day_str = wo['work_order_open_day']
    
    needs_update = False
    try:
        d, m, y = open_day_str.split('-')
        dt = datetime(2000 + int(y), int(m), int(d))
        if dt > TODAY:
            needs_update = True
    except:
        needs_update = True
        
    if needs_update:
        # Assign a random date between 3 and 15 days ago
        new_dt = TODAY - timedelta(days=random.randint(3, 20))
        new_str = new_dt.strftime('%d-%m-%y')
        
        cursor.execute("UPDATE work_order SET work_order_open_day = ? WHERE id = ?", (new_str, wo_id))
        
        # Also update task items to match
        cursor.execute("""
            UPDATE work_order_task_item 
            SET work_order_task_item_open_day = ?, work_order_task_item_finish_day = ?
            WHERE work_order = ?
        """, (new_str, new_str, wo_id))
        
        updated_count += 1

conn.commit()
print(f"Success. Updated {updated_count} work orders to historical dates.")
conn.close()
