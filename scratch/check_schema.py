import sqlite3
import os

db_path = os.path.join("backend", "maintenance.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(asset)")
print("--- Asset Columns ---")
for col in cursor.fetchall():
    print(col)

cursor.execute("PRAGMA table_info(work_order)")
print("\n--- Work Order Columns ---")
for col in cursor.fetchall():
    print(col)

conn.close()
