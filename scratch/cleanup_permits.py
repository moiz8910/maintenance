import sqlite3
import os
import random

db_path = os.path.join("backend", "maintenance.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Cleaning up permit statuses...")

# 1. Replace any 'Permit Log' or invalid statuses with something logical
cursor.execute("SELECT id, status FROM work_permit")
permits = cursor.fetchall()

for pid, status in permits:
    if status == "Permit Log" or status is None:
        # Check if parent WO is closed
        cursor.execute("""
            SELECT work_order_status FROM work_order 
            WHERE id = (
                SELECT work_order FROM work_order_task_item 
                WHERE id = (SELECT work_order_task_item FROM work_permit WHERE id = ?)
            )
        """, (pid,))
        res = cursor.fetchone()
        if res and res[0].lower() == 'closed':
            new_status = "Available"
        else:
            new_status = random.choice(["Available", "Unavailable"])
        
        cursor.execute("UPDATE work_permit SET status = ? WHERE id = ?", (new_status, pid))
        print(f"  Fixed Permit {pid}: {status} -> {new_status}")

# 2. Force all Closed WO permits to Available
cursor.execute("""
    UPDATE work_permit 
    SET status = 'Available' 
    WHERE work_order_task_item IN (
        SELECT id FROM work_order_task_item 
        WHERE work_order IN (SELECT id FROM work_order WHERE LOWER(work_order_status) = 'closed')
    )
""")

conn.commit()
conn.close()
print("Cleanup finished.")
