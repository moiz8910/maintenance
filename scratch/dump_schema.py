"""Quick script to dump all table schemas from the DB."""
import sqlite3
conn = sqlite3.connect("backend/maintenance.db")
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [r[0] for r in cursor.fetchall()]
for t in tables:
    cursor.execute(f"PRAGMA table_info({t})")
    cols = cursor.fetchall()
    cursor.execute(f"SELECT COUNT(*) FROM {t}")
    cnt = cursor.fetchone()[0]
    print(f"\n{'='*60}")
    print(f"TABLE: {t}  ({cnt} rows)")
    for c in cols:
        print(f"  {c[1]:45s} {c[2]}")
    # Sample row
    cursor.execute(f"SELECT * FROM {t} LIMIT 1")
    row = cursor.fetchone()
    if row:
        print(f"  SAMPLE: {str(row)[:120]}")
conn.close()
