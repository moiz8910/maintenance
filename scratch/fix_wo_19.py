import sqlite3
import os

db_path = "backend/maintenance.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

def fix_wo_19():
    print("--- Fixing WO-0019 (Dial Gauge) ---")
    
    # 1. Ensure WO-0019 is Pending and opened on 09-05-26
    cursor.execute("UPDATE work_order SET work_order_status = 'Pending', work_order_open_day = '09-05-26' WHERE id = 'WO-0019'")
    
    # 2. Get a task item for WO-0019
    cursor.execute("SELECT id FROM work_order_task_item WHERE work_order = 'WO-0019' LIMIT 1")
    ti = cursor.fetchone()
    if not ti:
        print("Error: No task item for WO-0019. Run schedule_pending_wos.py first.")
        return
    ti_id = ti['id']
    
    # 3. Add Dial Gauge with 30 days lead time and shortage
    # Find or create Dial Gauge in material_master
    cursor.execute("SELECT id FROM material_master WHERE description LIKE '%Dial Gauge%'")
    mat = cursor.fetchone()
    if not mat:
        mat_id = "MAT-DG-001"
        cursor.execute("INSERT INTO material_master (id, description, material_type, unit_of_measurement) VALUES (?, ?, ?, ?)",
                       (mat_id, "Precision Dial Gauge", "Spare", "EA"))
    else:
        mat_id = mat['id']
        
    # Ensure shortage: Required 1, Available 0
    cursor.execute("DELETE FROM on_hand_inventory WHERE material = ?", (mat_id,))
    cursor.execute("INSERT INTO on_hand_inventory (batch_number, material, stock_available_on_hand, receipt_date) VALUES (?, ?, ?, ?)",
                   ("BATCH-DG", mat_id, 0, "01-01-26"))
                   
    # Linkage with 30 days lead time
    cursor.execute("DELETE FROM task_material_linkage WHERE work_order_task_item = ?", (ti_id,))
    cursor.execute("""
        INSERT INTO task_material_linkage (work_order_task_item, material_used, quantity_used, lead_time)
        VALUES (?, ?, ?, ?)
    """, (ti_id, mat_id, 1, 30))
    
    conn.commit()
    print("Fixed WO-0019 with Dial Gauge (30 days lead time).")

if __name__ == "__main__":
    fix_wo_19()
conn.close()
