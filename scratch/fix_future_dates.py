import sqlite3
from datetime import datetime

def fix_future_open_dates():
    db_path = 'backend/maintenance.db'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    today_str = '11-05-26'
    today_dt = datetime.strptime(today_str, '%d-%m-%y')
    
    cursor.execute("SELECT id, work_order_open_day FROM work_order")
    rows = cursor.fetchall()
    
    updated_count = 0
    for wo_id, open_day in rows:
        if not open_day:
            continue
        try:
            open_dt = datetime.strptime(open_day, '%d-%m-%y')
            if open_dt > today_dt:
                cursor.execute("UPDATE work_order SET work_order_open_day = ? WHERE id = ?", (today_str, wo_id))
                updated_count += 1
        except ValueError:
            # Handle other formats if any
            continue
            
    conn.commit()
    conn.close()
    print(f"Successfully updated {updated_count} work orders with future open dates to {today_str}")

if __name__ == "__main__":
    fix_future_open_dates()
