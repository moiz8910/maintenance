import sqlite3
def check():
    conn = sqlite3.connect('backend/maintenance.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM work_order WHERE work_order_status = 'Pending'")
    pending_ids = [r[0] for r in cursor.fetchall()]
    print(f"Total Pending WOs: {len(pending_ids)}")
    
    cursor.execute("SELECT DISTINCT work_order FROM work_order_task_item")
    tasked_ids = [r[0] for r in cursor.fetchall()]
    print(f"WOs with Tasks: {len(tasked_ids)}")
    
    missing = [i for i in pending_ids if i not in tasked_ids]
    print(f"Pending WOs missing tasks: {len(missing)}")
    if missing:
        print(f"Sample missing: {missing[:5]}")
        
    cursor.execute("SELECT DISTINCT work_order_task_item FROM work_permit")
    permit_task_items = [r[0] for r in cursor.fetchall()]
    print(f"Task items with permits: {len(permit_task_items)}")
    
    cursor.execute("SELECT DISTINCT work_order_task_item FROM task_material_linkage")
    material_task_items = [r[0] for r in cursor.fetchall()]
    print(f"Task items with materials: {len(material_task_items)}")
    
    conn.close()
if __name__ == "__main__":
    check()
