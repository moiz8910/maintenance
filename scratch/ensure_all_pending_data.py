import sqlite3
import random

def fix():
    conn = sqlite3.connect('backend/maintenance.db')
    cursor = conn.cursor()
    
    # 1. Get all Pending WOs
    cursor.execute("SELECT id, asset_id FROM work_order WHERE work_order_status = 'Pending'")
    pending = cursor.fetchall()
    
    for wo_id, asset_id in pending:
        # Check if has tasks
        cursor.execute("SELECT id FROM work_order_task_item WHERE work_order = ?", (wo_id,))
        tasks = cursor.fetchall()
        
        if not tasks:
            print(f"Creating tasks for {wo_id}...")
            # Create a generic task
            task_id = "TASK-0001"
            cursor.execute("INSERT INTO work_order_task_item (work_order, task, asset, work_order_task_item_open_day) VALUES (?, ?, ?, ?)",
                           (wo_id, task_id, asset_id or "ASSET-0001", "13-05-26"))
            tasks = [(cursor.lastrowid,)]
            
        for (ti_id,) in tasks:
            # Ensure material
            cursor.execute("SELECT id FROM task_material_linkage WHERE work_order_task_item = ?", (ti_id,))
            if not cursor.fetchone():
                print(f"  Adding material to task {ti_id}...")
                mat_id = "MAT-0001"
                cursor.execute("INSERT INTO task_material_linkage (material_used, work_order_task_item, quantity_used, material_price) VALUES (?, ?, ?, ?)",
                               (mat_id, ti_id, 1, 1))
            
            # Ensure permit
            cursor.execute("SELECT id FROM work_permit WHERE work_order_task_item = ?", (ti_id,))
            if not cursor.fetchone():
                print(f"  Adding permit to task {ti_id}...")
                cursor.execute("INSERT INTO work_permit (work_order_task_item, type, status) VALUES (?, ?, ?)",
                               (ti_id, "Hot Work", "Active"))
                
    conn.commit()
    conn.close()

if __name__ == "__main__":
    fix()
