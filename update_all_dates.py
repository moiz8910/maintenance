"""
update_all_dates.py
-------------------
Ensures no work order has an open date before today.
Re-schedules ALL work orders:
  - Sorted by asset criticality (1 -> 2 -> 3) then by current open date
  - Max 4 work orders per calendar day
  - Start date = today
  - Task item dates are shifted by the same delta as the WO open date
  - finish_day is set to the same day as the task item open_day
"""
import sqlite3
from datetime import datetime, timedelta

DB_PATH  = "backend/maintenance.db"
TODAY    = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
MAX_PER_DAY = 4
# WO open date is set to today-2 or today-3 (raised before scheduling)
import random as _random
WO_OPEN_OFFSETS = [-2, -3]

def parse_day(day_str: str):
    """Parse DD-MM-YY -> datetime.  Returns None on failure."""
    if not day_str:
        return None
    try:
        d, m, y = day_str.strip().split('-')
        return datetime(2000 + int(y), int(m), int(d))
    except Exception:
        return None

def fmt_day(dt: datetime) -> str:
    return dt.strftime("%d-%m-%y")

def update_dates():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # ── 1. Fetch all WOs with their best asset criticality ────────────────────
    cursor.execute("""
        SELECT w.id,
               w.work_order_open_day,
               w.work_order_open_time,
               w.work_order_status,
               MIN(COALESCE(CAST(a.criticality AS INTEGER), 9)) AS criticality
        FROM work_order w
        LEFT JOIN work_order_task_item woti ON woti.work_order = w.id
        LEFT JOIN asset a ON woti.asset = a.id
        GROUP BY w.id
        ORDER BY MIN(COALESCE(CAST(a.criticality AS INTEGER), 9)) ASC,
                 w.work_order_open_day ASC,
                 w.id ASC
    """)
    all_wos = [dict(r) for r in cursor.fetchall()]
    print(f"Total work orders to reschedule: {len(all_wos)}")

    # ── 2. Assign task scheduling slots (max 4/day from today) ───────────────
    schedule_day  = TODAY      # task items start from today
    count_on_day  = 0
    updated = 0
    skipped = 0

    for wo in all_wos:
        wo_id       = wo['id']
        old_day_str = wo['work_order_open_day']
        wo_status   = (wo.get('work_order_status') or '').lower()

        # ── Task scheduling slot ──────────────────────────────────────────────
        if count_on_day >= MAX_PER_DAY:
            schedule_day  = schedule_day + timedelta(days=1)
            count_on_day  = 0
        count_on_day += 1

        # Rule: No work order can be closed in the future.
        if wo_status == 'closed' and schedule_day > TODAY:
            task_day = TODAY
        else:
            task_day = schedule_day          # when the work is actually done
        
        task_day_str = fmt_day(task_day)

        # ── WO open date: today-2 or today-3 ─────────────────────────────────
        # (WO was raised a couple of days before it was scheduled)
        wo_open_day     = TODAY + timedelta(days=_random.choice(WO_OPEN_OFFSETS))
        wo_open_day_str = fmt_day(wo_open_day)

        # ── 3. Shift task items to the scheduling slot ────────────────────────
        cursor.execute("""
            SELECT id, work_order_task_item_open_day, work_order_task_item_open_time,
                   work_order_task_item_finish_day, work_order_task_item_finish_time
            FROM work_order_task_item
            WHERE work_order = ?
        """, (wo_id,))
        task_items = [dict(r) for r in cursor.fetchall()]

        for ti in task_items:
            ti_id        = ti['id']
            old_open_day = parse_day(ti['work_order_task_item_open_day'])
            old_fin_day  = parse_day(ti['work_order_task_item_finish_day'])

            # Compute delta from old task open day to new scheduling day
            if old_open_day:
                delta = (task_day - old_open_day).days
                new_open_day = old_open_day + timedelta(days=delta)
                new_fin_day  = (old_fin_day + timedelta(days=delta)) if old_fin_day else new_open_day
            else:
                new_open_day = task_day
                new_fin_day  = task_day

            cursor.execute("""
                UPDATE work_order_task_item
                SET work_order_task_item_open_day   = ?,
                    work_order_task_item_finish_day = ?
                WHERE id = ?
            """, (fmt_day(new_open_day), fmt_day(new_fin_day), ti_id))

        # ── 4. Update WO open_day to today-2 or today-3 ──────────────────────
        cursor.execute("""
            UPDATE work_order SET work_order_open_day = ? WHERE id = ?
        """, (wo_open_day_str, wo_id))

        # ── 5. Shift closed WO end date proportionally ────────────────────────
        if wo_status == 'closed':
            cursor.execute(
                "SELECT work_order_end_day FROM work_order WHERE id = ?", (wo_id,)
            )
            end_row = cursor.fetchone()
            if end_row and end_row['work_order_end_day']:
                old_end = parse_day(end_row['work_order_end_day'])
                if old_end:
                    new_end = task_day  # close date = task scheduling day
                    cursor.execute(
                        "UPDATE work_order SET work_order_end_day = ? WHERE id = ?",
                        (fmt_day(new_end), wo_id)
                    )

        print(f"  {wo_id} | Crit {wo['criticality']} | Opened {wo_open_day_str} | Scheduled {task_day_str}")
        if old_day_str != wo_open_day_str:
            updated += 1
        else:
            skipped += 1

    conn.commit()
    conn.close()

    last_day   = fmt_day(schedule_day)
    total_days = (schedule_day - TODAY).days + 1
    print(f"\nDone. Updated {updated} WO(s), {skipped} unchanged.")
    print(f"  WO open dates : today-3 ({fmt_day(TODAY + timedelta(days=-3))}) to today-2 ({fmt_day(TODAY + timedelta(days=-2))})")
    print(f"  Task schedule : {fmt_day(TODAY)} -> {last_day}  ({total_days} day(s))")

if __name__ == "__main__":
    update_dates()
