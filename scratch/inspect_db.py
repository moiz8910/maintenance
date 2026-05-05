import sqlite3
import os

db_path = os.path.join("backend", "maintenance.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Asset Types ---")
cursor.execute("SELECT * FROM asset_type LIMIT 10")
for row in cursor.fetchall():
    print(row)

print("\n--- Tasks ---")
cursor.execute("SELECT * FROM task LIMIT 10")
for row in cursor.fetchall():
    print(row)

conn.close()
