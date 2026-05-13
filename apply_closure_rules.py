"""
apply_closure_rules.py
----------------------
Business Rules:
1. A Pending work order whose LAST task item finish datetime < NOW
   should be marked as Closed.
2. For each such WO, its permit status must be set to 'Available'
   with a status_change_timestamp that is <= the FIRST task item open time
   (i.e. within the same date, at or before that time).
"""
import sqlite3
import random
from datetime import datetime, timedelta

DB_PATH = "backend/maintenance.db"
NOW = datetime.now()   # always evaluate against real current time

def parse_dt(day_str, time_str):
    """Parse 'DD-MM-YY' date and 'HH:MM' time into a datetime."""
    if not day_str or not time_str:
        return None
    try:
        d, m, y = day_str.strip().split('-')
        h, mi = time_str.strip().split(':')
        return datetime(2000 + int(y), int(m), int(d), int(h), int(mi))
    except Exception as e:
        print(f"  [WARN] Could not parse date='{day_str}' time='{time_str}': {e}")
        return None


def apply_rules():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # ── 1. Get all PENDING work orders ──────────────────────────────────────
    cursor.execute("SELECT id FROM work_order WHERE LOWER(work_order_status) = 'pending'")
    pending_ids = [r['id'] for r in cursor.fetchall()]
    print(f"Evaluating {len(pending_ids)} pending work orders against current time {NOW}...")

    closed_count = 0

    # ── 2. Apply rules to newly auto-closed work orders ──────────────────────
    for wo_id in pending_ids:
        # Get WO open time for the rule "between open time and first task start"
        cursor.execute("SELECT work_order_open_day, work_order_open_time FROM work_order WHERE id = ?", (wo_id,))
        wo_row = cursor.fetchone()
        wo_open_dt = parse_dt(wo_row['work_order_open_day'], wo_row['work_order_open_time'])

        # Get ALL task items for this WO ordered by finish time descending (latest last)
        cursor.execute("""
            SELECT work_order_task_item_open_day,
                   work_order_task_item_open_time,
                   work_order_task_item_finish_time
            FROM work_order_task_item
            WHERE work_order = ?
            ORDER BY work_order_task_item_open_day DESC, work_order_task_item_finish_time DESC
        """, (wo_id,))
        task_items = cursor.fetchall()

        if not task_items:
            continue

        # Rule: use the last task item's finish datetime
        last = task_items[0]
        last_finish_dt = parse_dt(last['work_order_task_item_open_day'],
                                  last['work_order_task_item_finish_time'])

        if last_finish_dt is None or last_finish_dt >= NOW:
            # Still in the future — keep as Pending
            continue

        # closure date/time = last task item's finish date + finish time
        closure_day = last['work_order_task_item_open_day']        # DD-MM-YY
        closure_time = last['work_order_task_item_finish_time']    # HH:MM

        # ── Close the work order and stamp the closure time ─────────────────
        cursor.execute(
            """UPDATE work_order
               SET work_order_status   = 'Closed',
                   work_order_end_day  = ?,
                   work_order_end_time = ?
               WHERE id = ?""",
            (closure_day, closure_time, wo_id)
        )
        closed_count += 1
        print(f"  [CLOSED] {wo_id}  (closure: {closure_day} {closure_time})")

        # Get the FIRST task item open datetime (earliest)
        cursor.execute("""
            SELECT work_order_task_item_open_day, work_order_task_item_open_time
            FROM work_order_task_item
            WHERE work_order = ?
            ORDER BY work_order_task_item_open_day ASC, work_order_task_item_open_time ASC
            LIMIT 1
        """, (wo_id,))
        first = cursor.fetchone()
        first_open_dt = parse_dt(first['work_order_task_item_open_day'],
                                 first['work_order_task_item_open_time']) if first else None

        # ── Update permit status to Available ───────────────────────────────
        # Timestamp must be between WO open time and first task open time.
        if first_open_dt and wo_open_dt:
            # Calculate difference in minutes
            diff = int((first_open_dt - wo_open_dt).total_seconds() / 60)
            if diff > 1:
                offset_mins = random.randint(0, diff - 1)
            else:
                offset_mins = 0
            permit_ts_dt = wo_open_dt + timedelta(minutes=offset_mins)
            permit_ts = permit_ts_dt.strftime("%H:%M")
        else:
            permit_ts = "07:30"   # safe fallback

        # Calculate permit end time: closure_time + 15-20 mins (Rule 7.2)
        p_end_time = closure_time
        try:
            h, m = map(int, closure_time.split(':'))
            m += random.randint(15, 20)
            if m >= 60:
                h += 1
                m -= 60
            p_end_time = f"{h:02d}:{m:02d}"
        except:
            pass

        # Update permits linked to this WO
        cursor.execute("""
            UPDATE work_permit
            SET status = 'Available',
                status_change_timestamp = ?,
                work_permit_open_day = ?,
                work_permit_open_time = ?,
                work_permit_end_day = ?,
                work_permit_end_time = ?
            WHERE work_order_task_item IN (
                SELECT id FROM work_order_task_item WHERE work_order = ?
            )
        """, (permit_ts, wo_row['work_order_open_day'], wo_row['work_order_open_time'], closure_day, p_end_time, wo_id))

        affected = cursor.rowcount
        print(f"           Permits updated: {affected}  (timestamp: {permit_ts})")

    # ── 3. Final Audit: Ensure ALL closed work orders have Available permits ──
    # and consistent timestamps
    cursor.execute("SELECT id, work_order_open_day, work_order_open_time FROM work_order WHERE LOWER(work_order_status) = 'closed'")
    all_closed = cursor.fetchall()
    
    for row in all_closed:
        wid = row['id']
        wo_open_dt = parse_dt(row['work_order_open_day'], row['work_order_open_time'])
        
        cursor.execute("""
            SELECT work_order_task_item_open_day, work_order_task_item_open_time
            FROM work_order_task_item
            WHERE work_order = ?
            ORDER BY work_order_task_item_open_day ASC, work_order_task_item_open_time ASC
            LIMIT 1
        """, (wid,))
        f_task = cursor.fetchone()
        f_task_dt = parse_dt(f_task['work_order_task_item_open_day'], f_task['work_order_task_item_open_time']) if f_task else None
        
        if f_task_dt and wo_open_dt:
            diff = int((f_task_dt - wo_open_dt).total_seconds() / 60)
            offset = random.randint(0, max(0, diff - 1))
            ts = (wo_open_dt + timedelta(minutes=offset)).strftime("%H:%M")
        else:
            ts = "07:30"

        # Calculate permit end time: closure_time + 15-20 mins (Rule 7.2)
        p_end_time = closure_time
        try:
            h, m = map(int, closure_time.split(':'))
            m += random.randint(15, 20)
            if m >= 60:
                h += 1
                m -= 60
            p_end_time = f"{h:02d}:{m:02d}"
        except:
            pass

        # ── Update permit status and times ──────────────────────────────────
        cursor.execute("""
            UPDATE work_permit
            SET status = 'Available',
                status_change_timestamp = ?,
                work_permit_open_day = ?,
                work_permit_open_time = ?,
                work_permit_end_day = ?,
                work_permit_end_time = ?
            WHERE work_order_task_item IN (
                SELECT id FROM work_order_task_item WHERE work_order = ?
            )
        """, (ts, row['work_order_open_day'], row['work_order_open_time'], closure_day, p_end_time, wid))

    # ── 4. Global Rule 7 Audit: Status cannot be 'Unavailable' if dates are present ──
    cursor.execute("""
        UPDATE work_permit 
        SET status = 'Available' 
        WHERE status = 'Unavailable' 
          AND work_permit_open_day IS NOT NULL 
          AND work_permit_open_day != ''
          AND work_permit_end_day IS NOT NULL 
          AND work_permit_end_day != ''
    """)
    print(f"Global Audit: Updated {cursor.rowcount} permits to Available due to date presence.")

    conn.commit()
    conn.close()
    print(f"\nDone. {closed_count} pending work orders moved to Closed.")


if __name__ == "__main__":
    apply_rules()
