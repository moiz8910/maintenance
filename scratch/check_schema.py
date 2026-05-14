import sqlite3
conn = sqlite3.connect('backend/maintenance.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tables:", [t[0] for t in tables])
for table in [t[0] for t in tables]:
    cursor.execute(f"PRAGMA table_info({table})")
    print(f"Schema for {table}:", cursor.fetchall())
conn.close()
