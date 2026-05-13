import sqlite3
import random
import os
from datetime import datetime, timedelta

DB_PATH = "backend/maintenance.db"

def populate():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 1. Find Pending WOs with 0 tasks
    cursor.execute("""
        SELECT w.id, w.repair_description, w.repair_type, w.asset_id, a.name as asset_name
        FROM work_order w
        LEFT JOIN asset a ON w.asset_id = a.id
        WHERE LOWER(w.work_order_status) = 'pending'
        AND (SELECT COUNT(*) FROM work_order_task_item WHERE work_order = w.id) = 0
    """)
    wos = cursor.fetchall()

    if not wos:
        print("All Pending work orders already have tasks.")
        conn.close()
        return

    print(f"Found {len(wos)} Pending work orders with missing task data. Populating...")

    # Reference data
    cursor.execute("SELECT id, discipline_trade FROM technician_engineer")
    techs = [dict(r) for r in cursor.fetchall()]
    
    cursor.execute("SELECT id, description FROM material_master")
    mats = [dict(r) for r in cursor.fetchall()]
    
    cursor.execute("SELECT id FROM contract_services")
    contracts = [r[0] for r in cursor.fetchall()]
    
    cursor.execute("SELECT id, description, discipline FROM task")
    all_tasks = [dict(r) for r in cursor.fetchall()]

    today = datetime.now()
    
    for wo in wos:
        wo_id = wo['id']
        asset_id = wo['asset_id']
        asset_name = wo['asset_name'] or "Unknown Asset"
        
        print(f"  -> Processing {wo_id}...")
        
        # Determine number of tasks (1-3)
        num_tasks = random.randint(1, 3)
        
        for i in range(num_tasks):
            task_item_id = f"WOT-{wo_id[3:]}-{i+1}"
            
            # Select a random task template
            task_tpl = random.choice(all_tasks)
            
            # Schedule date: within 1-5 days from today
            sched_date = today + timedelta(days=random.randint(1, 5))
            date_str = sched_date.strftime("%d-%m-%y")
            
            cursor.execute("""
                INSERT INTO work_order_task_item 
                (id, work_order, asset, task, work_order_task_item_open_day, work_order_task_item_open_time, work_order_task_item_finish_day, work_order_task_item_finish_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (task_item_id, wo_id, asset_id, task_tpl['id'], date_str, "08:00", date_str, "16:00"))
            
            # Link Manpower
            tech = random.choice([t for t in techs if t['discipline_trade'] == task_tpl['discipline']] or techs)
            cursor.execute("""
                INSERT INTO technician_engineer_linkage (work_order_task_item, technician_engineer_engaged, technician_service_period)
                VALUES (?, ?, ?)
            """, (task_item_id, tech['id'], 8))
            
            # Link Material (1-2)
            for _ in range(random.randint(1, 2)):
                mat = random.choice(mats)
                cursor.execute("""
                    INSERT INTO task_material_linkage (id, material_used, work_order_task_item, quantity_used, material_price)
                    VALUES (?, ?, ?, ?, ?)
                """, (f"TML-{task_item_id}-{random.randint(1000,9999)}", mat['id'], task_item_id, random.randint(1, 5), 100))
                
            # Link Contract (randomly)
            if random.random() > 0.5 and contracts:
                cursor.execute("""
                    INSERT INTO contract_linkage (contract_engaged, work_order_task_item, contract_value_expended)
                    VALUES (?, ?, ?)
                """, (random.choice(contracts), task_item_id, 1000))

            # Add a Permit for the first task
            if i == 0:
                permit_id = f"WP-{wo_id[3:]}-{random.randint(10, 99)}"
                cursor.execute("""
                    INSERT INTO work_permit (id, description, type, work_order_task_item, work_permit_open_day, work_permit_open_time, work_permit_end_day, work_permit_end_time, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (permit_id, f"Safe work permit for {wo_id}", "General Maintenance", task_item_id, date_str, "08:30", date_str, "17:00", "Active"))

    conn.commit()
    conn.close()
    print("Done. All Pending work orders now have scheduled tasks and resources.")

if __name__ == "__main__":
    populate()
