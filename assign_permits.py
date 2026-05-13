import sqlite3
import random

def assign_permits():
    db_path = "backend/maintenance.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Get all work orders
    cursor.execute("SELECT id, work_order_status, work_order_open_time, work_order_open_day FROM work_order")
    all_wos = cursor.fetchall()
    total_wos = len(all_wos)
    
    if total_wos == 0:
        print("No work orders found.")
        return

    # 2. Select 80% to have permits
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
        wo_open_day = wo_info[3] or "01-05-26"

        # Get the first and last task items for this WO to set permit duration
        cursor.execute("""
            SELECT id, work_order_task_item_open_day, work_order_task_item_open_time,
                   work_order_task_item_finish_day, work_order_task_item_finish_time
            FROM work_order_task_item 
            WHERE work_order = ?
            ORDER BY work_order_task_item_open_day ASC, work_order_task_item_open_time ASC
        """, (wo_id,))
        tasks = cursor.fetchall()
        if not tasks:
            continue
            
        first_task = tasks[0]
        last_task = tasks[-1]
        task_item_id = first_task[0]
        
        # Rule 7.3: Start time cannot be earlier than work order open time
        p_open_day = wo_open_day
        p_open_time = wo_open_time
        
        # Rule 7.2: End of work permit should be 15-20 minutes more than the last task item close time
        p_end_day = last_task[3]
        last_finish_time = last_task[4] or "17:00"
        try:
            h, m = map(int, last_finish_time.split(':'))
            m += random.randint(15, 20)
            if m >= 60:
                h += 1
                m -= 60
            p_end_time = f"{h:02d}:{m:02d}"
        except:
            p_end_time = last_finish_time

        permit_id = f"WP-{wo_id[-4:]}-{i+1}"
        p_type = random.choice(permit_types)
        desc = f"Permit for {p_type} on {wo_id}"
        
        if wo_status == "closed":
            p_status = "Available"
        else:
            p_status = "Available" if random.random() < 0.75 else "Unavailable"
        
        # Rule: Status change timestamp should be within 1 hour of work order open time
        try:
            h, m = map(int, wo_open_time.split(':'))
            m += random.randint(0, 59)
            if m >= 60:
                h += 1
                m -= 60
            status_ts = f"{h:02d}:{m:02d}"
        except:
            status_ts = wo_open_time

        cursor.execute("""
            INSERT INTO work_permit (id, work_order_task_item, description, type, status, status_change_timestamp,
                                    work_permit_open_day, work_permit_open_time, 
                                    work_permit_end_day, work_permit_end_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (permit_id, task_item_id, desc, p_type, p_status, status_ts, 
              p_open_day, p_open_time, p_end_day, p_end_time))

    conn.commit()
    conn.close()
    print("Permit assignment complete.")

if __name__ == "__main__":
    assign_permits()
