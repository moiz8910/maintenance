"""
fix_id_duplicates.py
--------------------
1. Checks for rows with the exact same primary key (id) in work_order table.
2. Also checks for WOs with same id but inserted as separate rows.
3. Deletes all but the first occurrence of each id.
"""
import sqlite3

DB_PATH = "backend/maintenance.db"

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# ── 1. Check for true duplicate IDs (same primary key) ───────────────────────
print("Checking for duplicate work order IDs...")
cursor.execute("""
    SELECT id, COUNT(*) as cnt
    FROM work_order
    GROUP BY id
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
""")
dup_ids = [dict(r) for r in cursor.fetchall()]

if not dup_ids:
    print("No duplicate IDs found in work_order table.")
else:
    print(f"Found {len(dup_ids)} IDs with duplicates:")
    for d in dup_ids:
        print(f"  {d['id']} appears {d['cnt']} times")

# ── 2. Show WO-0139 specifically ─────────────────────────────────────────────
print("\nAll rows for WO-0139:")
cursor.execute("SELECT rowid, id, repair_description, repair_type, work_order_class, work_order_status FROM work_order WHERE id = 'WO-0139'")
rows_0139 = cursor.fetchall()
for r in rows_0139:
    print(f"  rowid={r['rowid']} | {r['id']} | {r['repair_description'][:50]} | {r['repair_type']} | {r['work_order_class']} | {r['work_order_status']}")

# ── 3. Delete duplicates by keeping lowest rowid for each id ─────────────────
print("\nRemoving duplicate rows (keeping the scheduled/task-having row for each id)...")
cursor.execute("""
    DELETE FROM work_order
    WHERE rowid NOT IN (
        SELECT MIN(w2.rowid)
        FROM work_order w2
        WHERE w2.id IN (
            SELECT id FROM work_order GROUP BY id HAVING COUNT(*) > 1
        )
        GROUP BY w2.id
    )
    AND id IN (
        SELECT id FROM work_order GROUP BY id HAVING COUNT(*) > 1
    )
""")
deleted = cursor.rowcount
print(f"Deleted {deleted} duplicate row(s).")

conn.commit()

# ── 4. Final check ────────────────────────────────────────────────────────────
cursor.execute("SELECT COUNT(*) FROM work_order")
total = cursor.fetchone()[0]
print(f"\nWork orders remaining: {total}")

cursor.execute("SELECT COUNT(*) FROM work_order WHERE id = 'WO-0139'")
count_0139 = cursor.fetchone()[0]
print(f"WO-0139 count after fix: {count_0139}")

conn.close()
