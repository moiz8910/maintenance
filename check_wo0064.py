import sqlite3
from datetime import datetime

DB_PATH = "backend/maintenance.db"
WO_ID = "WO-0064"
NOW = datetime.now()

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

print(f"=== Checking {WO_ID} === (now={NOW})\n")

# 1. Work order status
row = conn.execute("SELECT id, work_order_status, work_order_open_day, work_order_open_time, work_order_end_day, work_order_end_time FROM work_order WHERE id=?", (WO_ID,)).fetchone()
if row:
    print(f"Status       : {row['work_order_status']}")
    print(f"Open         : {row['work_order_open_day']} {row['work_order_open_time']}")
    print(f"End (DB)     : {row['work_order_end_day']} {row['work_order_end_time']}")
else:
    print("WO not found in DB!")

print()

# 2. Task items
tasks = conn.execute("""
    SELECT id, work_order_task_item_open_day, work_order_task_item_open_time,
           work_order_task_item_finish_day, work_order_task_item_finish_time
    FROM work_order_task_item WHERE work_order=?
    ORDER BY work_order_task_item_open_day DESC, work_order_task_item_finish_time DESC
""", (WO_ID,)).fetchall()

print(f"Task items ({len(tasks)}):")
for t in tasks:
    day = t['work_order_task_item_open_day'] or ''
    ftime = t['work_order_task_item_finish_time'] or ''
    try:
        d,m,y = day.strip().split('-')
        h,mi = ftime.strip().split(':')
        dt = datetime(2000+int(y), int(m), int(d), int(h), int(mi))
        past = "PAST ✓" if dt < NOW else "FUTURE ✗"
    except:
        dt = None
        past = "PARSE ERROR"
    print(f"  Task {t['id']}: finish={day} {ftime}  → {past}")

print()

# 3. Test the closure fix inline
last = conn.execute("""
    SELECT work_order_task_item_open_day AS day, work_order_task_item_finish_time AS time
    FROM work_order_task_item WHERE work_order=?
    ORDER BY work_order_task_item_open_day DESC, work_order_task_item_finish_time DESC
    LIMIT 1
""", (WO_ID,)).fetchone()

if last:
    try:
        d,m,y = last['day'].strip().split('-')
        h,mi = last['time'].strip().split(':')
        last_dt = datetime(2000+int(y), int(m), int(d), int(h), int(mi))
        print(f"Last task finish : {last['day']} {last['time']} → {last_dt}")
        print(f"NOW              : {NOW}")
        print(f"Should close?    : {'YES' if last_dt < NOW else 'NO'}")
    except Exception as e:
        print(f"Parse error: {e}")

conn.close()
