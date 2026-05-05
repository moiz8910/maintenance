import sqlite3
import random
from datetime import datetime, timedelta

def schedule_wos():
    db_path = "backend/maintenance.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Get all pending work orders
    cursor.execute("SELECT id FROM work_order WHERE LOWER(work_order_status) = 'pending'")
    pending_wos = [row[0] for row in cursor.fetchall()]
    print(f"Found {len(pending_wos)} pending work orders.")

    # 2. Get available tasks/techs/assets
    cursor.execute("SELECT id FROM task")
    available_tasks = [row[0] for row in cursor.fetchall()]
    cursor.execute("SELECT id FROM technician_engineer")
    available_techs = [row[0] for row in cursor.fetchall()]
    cursor.execute("SELECT id FROM asset")
    available_assets = [row[0] for row in cursor.fetchall()]

    today = datetime(2026, 5, 4)
    start_date = datetime(2026, 5, 5)
    end_date = datetime(2026, 5, 25)
    days_range = (end_date - start_date).days

    for wo_id in pending_wos:
        cursor.execute("SELECT repair_type, work_order_class FROM work_order WHERE id = ?", (wo_id,))
        row = cursor.fetchone()
        repair_type = (row[0] or "").lower()
        wo_class = (row[1] or "").upper()

        if "breakdown" in repair_type:
            if wo_class == 'A':
                random_day = today + timedelta(days=random.randint(0, 1))
            elif wo_class in ['B', 'C']:
                random_day = today + timedelta(days=random.randint(0, 2))
            else:
                random_day = today + timedelta(days=random.randint(0, 3))
        else:
            random_day = start_date + timedelta(days=random.randint(0, days_range))

        num_tasks = random.choice([1, 1, 2])
        date_str = random_day.strftime("%d-%m-%y")
        
        # Clear existing
        cursor.execute("DELETE FROM work_order_task_item WHERE work_order = ?", (wo_id,))
        cursor.execute("DELETE FROM technician_engineer_linkage WHERE work_order_task_item NOT IN (SELECT id FROM work_order_task_item)")

        earliest_start_hour = 24
        earliest_start_min = 60

        for i in range(num_tasks):
            task_id = random.choice(available_tasks)
            
            # Get task discipline to ensure correct resource assignment
            cursor.execute("SELECT discipline FROM task WHERE id = ?", (task_id,))
            task_disc = cursor.fetchone()[0]
            
            # Find matching technicians from the same discipline
            cursor.execute("SELECT id FROM technician_engineer WHERE LOWER(discipline_trade) = LOWER(?)", (task_disc,))
            matching_techs = [r[0] for r in cursor.fetchall()]
            
            # Fallback if no specific discipline tech is found
            tech_id = random.choice(matching_techs) if matching_techs else random.choice(available_techs)

            start_hour = random.randint(8, 15)
            start_min = random.choice([0, 15, 30, 45])
            
            if start_hour < earliest_start_hour or (start_hour == earliest_start_hour and start_min < earliest_start_min):
                earliest_start_hour = start_hour
                earliest_start_min = start_min

            start_time = f"{start_hour:02d}:{start_min:02d}"
            duration = random.randint(2, 6)
            end_time = f"{start_hour + duration:02d}:{start_min:02d}"
            task_item_id = f"WOT-{wo_id[-4:]}-{i+1}"
            
            # Assign a random asset to this task item
            asset_id = random.choice(available_assets)

            cursor.execute("""
                INSERT INTO work_order_task_item (id, work_order, asset, task, work_order_task_item_open_day, work_order_task_item_open_time, work_order_task_item_finish_time)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (task_item_id, wo_id, asset_id, task_id, date_str, start_time, end_time))
            
            cursor.execute("""
                INSERT INTO technician_engineer_linkage (work_order_task_item, technician_engineer_engaged, technician_service_period)
                VALUES (?, ?, ?)
            """, (task_item_id, tech_id, duration))

        wo_open_min = earliest_start_min - 30
        wo_open_hour = earliest_start_hour
        if wo_open_min < 0:
            wo_open_min += 60
            wo_open_hour -= 1
        
        wo_open_time = f"{wo_open_hour:02d}:{wo_open_min:02d}"
        cursor.execute("UPDATE work_order SET work_order_open_day = ?, work_order_open_time = ? WHERE id = ?", (date_str, wo_open_time, wo_id))

    conn.commit()
    conn.close()
    print("Discipline-consistent rescheduling complete.")

if __name__ == "__main__":
    schedule_wos()
