import sqlite3
import random

def assign_permits():
    db_path = "backend/maintenance.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Get all work orders (not just pending, to handle 'Closed' ones too)
    cursor.execute("SELECT id, work_order_status, work_order_open_time FROM work_order")
    all_wos = cursor.fetchall()
    total_wos = len(all_wos)
    
    if total_wos == 0:
        print("No work orders found.")
        return

    # 2. Select 80% to have permits (using same logic but for all)
    num_with_permits = int(total_wos * 0.8)
    wos_to_permit = random.sample([row[0] for row in all_wos], num_with_permits)
    
    print(f"Assigning permits to {num_with_permits} out of {total_wos} work orders.")

    # 3. Clear existing permits
    cursor.execute("DELETE FROM work_permit")

    permit_types = ["Hot Work", "Height Work", "Electrical Isolation", "Confined Space", "General Maintenance"]

    for i, wo_id in enumerate(wos_to_permit):
        wo_info = next(row for row in all_wos if row[0] == wo_id)
        wo_status = (wo_info[1] or "").lower()
        wo_open_time = wo_info[2] or "08:00"

        # Get the first task item for this WO
        cursor.execute("SELECT id FROM work_order_task_item WHERE work_order = ? LIMIT 1", (wo_id,))
        task_item = cursor.fetchone()
        if not task_item:
            continue
            
        task_item_id = task_item[0]
        permit_id = f"WP-{wo_id[-4:]}-{i+1}"
        p_type = random.choice(permit_types)
        desc = f"Permit for {p_type} on {wo_id}"
        
        # Rule: No work order can be closed without the permit status as unavailable. 
        # The permit status should be changed to available as it is closed.
        # This implies: If WO is Closed -> Permit is Available.
        # For Open (Pending) WOs -> Can be Available or Unavailable.
        
        if wo_status == "closed":
            p_status = "Available"
        else:
            # 75% chance of being Available to meet the "at least 70%" requirement
            p_status = "Available" if random.random() < 0.75 else "Unavailable"
        
        # Rule: Time stamp should be within 1 hour of work order open time stamp.
        status_ts = None
        if p_status == "Available":
            try:
                h, m = map(int, wo_open_time.split(':'))
                # Add random minutes (0 to 59)
                m += random.randint(0, 59)
                if m >= 60:
                    h += 1
                    m -= 60
                status_ts = f"{h:02d}:{m:02d}"
            except:
                status_ts = wo_open_time

        cursor.execute("""
            INSERT INTO work_permit (id, work_order_task_item, description, type, status, status_change_timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (permit_id, task_item_id, desc, p_type, p_status, status_ts))

    conn.commit()
    conn.close()
    print("Permit assignment complete.")

if __name__ == "__main__":
    assign_permits()
