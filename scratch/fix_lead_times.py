import sqlite3
import os

db_path = "backend/maintenance.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("--- Checking Lead Times ---")
cursor.execute("SELECT id, material_used, lead_time FROM task_material_linkage WHERE lead_time IS NULL")
null_lts = cursor.fetchall()
print(f"Found {len(null_lts)} entries with NULL lead_time.")

if null_lts:
    print("Setting default lead_time = 7 for NULL entries to avoid API hangs...")
    cursor.execute("UPDATE task_material_linkage SET lead_time = 7 WHERE lead_time IS NULL")
    conn.commit()
    print("Updated successfully.")

conn.close()
