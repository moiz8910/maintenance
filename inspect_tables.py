import sqlite3
import os

DB_PATH = "backend/maintenance.db"
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

tables = [
    'technician_engineer_linkage',
    'task_material_linkage',
    'contract_linkage',
    'work_permit',
    'work_order_task_item'
]

for table in tables:
    print(f"\n--- {table} ---")
    cursor.execute(f"PRAGMA table_info({table})")
    for col in cursor.fetchall():
        print(col)

conn.close()
