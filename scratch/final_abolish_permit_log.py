import sqlite3
import os

db_path = os.path.join("backend", "maintenance.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("UPDATE work_permit SET status = 'Unavailable' WHERE status = 'Permit Log'")
print(f"Updated {cursor.rowcount} rows in work_permit status.")

# Also check other tables just in case
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cursor.fetchall()]

for table in tables:
    cursor.execute(f"PRAGMA table_info({table})")
    cols = [c[1] for c in cursor.fetchall()]
    for col in cols:
        cursor.execute(f"UPDATE {table} SET {col} = 'Unavailable' WHERE {col} = 'Permit Log'")
        if cursor.rowcount > 0:
            print(f"  Fixed {cursor.rowcount} occurrences in {table}.{col}")

conn.commit()
conn.close()
