"""
ensure_pending_pct.py
---------------------
Guarantees that at least 20% of all work orders have status = 'Pending'.

Logic:
  1. Count total WOs and current Pending WOs.
  2. If pending% >= 20% -> nothing to do.
  3. If pending% < 20%  -> promote WOs to Pending in this priority order:
       In-Progress -> Approved -> Closed
     until the 20% threshold is met.
  4. For any WO promoted to Pending, also ensure its task items are
     scheduled from today onwards (so they are not considered "past due").
"""
import sqlite3
import random
from datetime import datetime, timedelta

DB_PATH     = "backend/maintenance.db"
MIN_PENDING = 0.20   # 20%
TODAY       = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

def fmt_day(dt: datetime) -> str:
    return dt.strftime("%d-%m-%y")

def ensure_pending():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # ── 1. Current distribution ────────────────────────────────────────────────
    cursor.execute("SELECT COUNT(*) FROM work_order")
    total = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM work_order WHERE LOWER(work_order_status) = 'pending'")
    current_pending = cursor.fetchone()[0]

    pct = current_pending / total if total else 0
    target_pending = max(int(total * MIN_PENDING), 1)
    needed = max(0, target_pending - current_pending)

    print(f"Work orders: {total} total | {current_pending} pending ({pct*100:.1f}%)")
    print(f"Target: {target_pending} pending ({MIN_PENDING*100:.0f}% of {total})")

    if needed == 0:
        print("[OK] Already at or above 20% pending. No changes needed.")
        conn.close()
        return

    print(f"Need to promote {needed} more WO(s) to Pending...")

    # ── 2. Candidates to promote (non-pending, ordered by promotability) ───────
    cursor.execute("""
        SELECT id, work_order_status FROM work_order
        WHERE LOWER(work_order_status) != 'pending'
        ORDER BY
            CASE LOWER(work_order_status)
                WHEN 'in-progress' THEN 1
                WHEN 'approved'    THEN 2
                WHEN 'closed'      THEN 3
                ELSE 4
            END,
            id ASC
        LIMIT ?
    """, (needed,))
    candidates = [dict(r) for r in cursor.fetchall()]

    if not candidates:
        print("No candidates found to promote.")
        conn.close()
        return

    # ── 3. Promote each candidate ──────────────────────────────────────────────
    promoted = []
    for wo in candidates:
        wo_id      = wo['id']
        old_status = wo['work_order_status']

        # Set status to Pending
        cursor.execute(
            "UPDATE work_order SET work_order_status = 'Pending' WHERE id = ?",
            (wo_id,)
        )

        # Set WO open_day to today-2 or today-3
        wo_open_day = TODAY + timedelta(days=random.choice([-2, -3]))
        cursor.execute(
            "UPDATE work_order SET work_order_open_day = ? WHERE id = ?",
            (fmt_day(wo_open_day), wo_id)
        )

        # Ensure task items are not in the past — shift any past task items to today
        cursor.execute("""
            SELECT id, work_order_task_item_open_day, work_order_task_item_finish_day
            FROM work_order_task_item WHERE work_order = ?
        """, (wo_id,))
        task_items = cursor.fetchall()

        for ti in task_items:
            ti_open_str = ti['work_order_task_item_open_day'] or ''
            needs_shift = False
            if ti_open_str:
                try:
                    d, m, y = ti_open_str.split('-')
                    ti_open_dt = datetime(2000 + int(y), int(m), int(d))
                    needs_shift = ti_open_dt < TODAY
                except Exception:
                    needs_shift = True
            else:
                needs_shift = True

            if needs_shift:
                cursor.execute("""
                    UPDATE work_order_task_item
                    SET work_order_task_item_open_day   = ?,
                        work_order_task_item_finish_day = ?
                    WHERE id = ?
                """, (fmt_day(TODAY), fmt_day(TODAY), ti['id']))

        promoted.append((wo_id, old_status))
        print(f"  Promoted {wo_id} ({old_status} -> Pending) | Opened {fmt_day(wo_open_day)}")

    conn.commit()
    conn.close()

    # ── 4. Summary ────────────────────────────────────────────────────────────
    new_pending = current_pending + len(promoted)
    new_pct = new_pending / total if total else 0
    print(f"\nDone. Promoted {len(promoted)} WO(s).")
    print(f"Pending: {new_pending}/{total} ({new_pct*100:.1f}%)  [OK]")

if __name__ == "__main__":
    ensure_pending()
