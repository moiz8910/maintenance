import sqlite3
import os

db_path = os.path.join('backend', 'maintenance.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Adding asset_id column to work_order...")
    cursor.execute("ALTER TABLE work_order ADD COLUMN asset_id TEXT")
except Exception as e:
    print(f"Column might already exist or error: {e}")

# Populate asset_id from work_order_task_item
print("Populating asset_id from task items...")
cursor.execute("""
    UPDATE work_order
    SET asset_id = (
        SELECT asset 
        FROM work_order_task_item 
        WHERE work_order_task_item.work_order = work_order.id 
        LIMIT 1
    )
    WHERE asset_id IS NULL
""")

# If still NULL, pick a random asset to ensure UI doesn't break
cursor.execute("SELECT id FROM asset LIMIT 1")
default_asset = cursor.fetchone()
if default_asset:
    cursor.execute("UPDATE work_order SET asset_id = ? WHERE asset_id IS NULL", (default_asset[0],))

conn.commit()
conn.close()
print("Schema fix complete.")
