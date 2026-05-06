"""
dedup_work_orders.py
--------------------
Removes duplicate work orders from the DB.
Two WOs are considered duplicates if they share the same:
  repair_description + repair_type + work_order_class

For each group of duplicates, the WO with the most task items
(i.e. the scheduled one) is kept; the rest are deleted along
with their task items, permits, and technician linkages.
"""
import sqlite3

DB_PATH = "backend/maintenance.db"

def dedup():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # ── 1. Find all WOs ───────────────────────────────────────────────────────
    cursor.execute("""
        SELECT w.id,
               TRIM(LOWER(COALESCE(w.repair_description,''))) AS desc_key,
               TRIM(LOWER(COALESCE(w.repair_type,'')))        AS type_key,
               TRIM(LOWER(COALESCE(w.work_order_class,'')))   AS class_key,
               (SELECT COUNT(*) FROM work_order_task_item t WHERE t.work_order = w.id) AS task_count
        FROM work_order w
        ORDER BY task_count DESC, w.id ASC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    print(f"Total work orders in DB: {len(rows)}")

    # ── 2. Group by (description + type + class) ──────────────────────────────
    groups: dict[str, list] = {}
    for row in rows:
        key = f"{row['desc_key']}||{row['type_key']}||{row['class_key']}"
        groups.setdefault(key, []).append(row)

    dup_groups = {k: v for k, v in groups.items() if len(v) > 1}
    print(f"Duplicate groups found: {len(dup_groups)}")

    if not dup_groups:
        print("No duplicates found. Nothing to do.")
        conn.close()
        return

    to_delete = []
    for key, group in dup_groups.items():
        # group is sorted by task_count DESC, id ASC → first = best to keep
        keeper = group[0]
        dupes  = group[1:]
        desc_preview = keeper['desc_key'][:60]
        print(f"\n  Keep : {keeper['id']} (tasks={keeper['task_count']}) — {desc_preview}")
        for d in dupes:
            print(f"  DEL  : {d['id']} (tasks={d['task_count']})")
            to_delete.append(d['id'])

    print(f"\nDeleting {len(to_delete)} duplicate work order(s)...")

    for wo_id in to_delete:
        # Delete in FK order: permits → technician linkage → task items → WO
        task_items = [r[0] for r in cursor.execute(
            "SELECT id FROM work_order_task_item WHERE work_order = ?", (wo_id,)
        ).fetchall()]

        if task_items:
            ph = ','.join('?' * len(task_items))
            cursor.execute(f"DELETE FROM work_permit WHERE work_order_task_item IN ({ph})", task_items)
            cursor.execute(f"DELETE FROM technician_engineer_linkage WHERE work_order_task_item IN ({ph})", task_items)
            cursor.execute(f"DELETE FROM task_material_linkage WHERE work_order_task_item IN ({ph})", task_items)
        cursor.execute("DELETE FROM work_order_task_item WHERE work_order = ?", (wo_id,))
        cursor.execute("DELETE FROM work_order WHERE id = ?", (wo_id,))
        print(f"  Deleted WO {wo_id}")

    conn.commit()
    conn.close()

    # ── 3. Summary ────────────────────────────────────────────────────────────
    final_conn = sqlite3.connect(DB_PATH)
    final_count = final_conn.execute("SELECT COUNT(*) FROM work_order").fetchone()[0]
    final_conn.close()
    print(f"\nDone. Work orders remaining: {final_count}")

if __name__ == "__main__":
    dedup()
