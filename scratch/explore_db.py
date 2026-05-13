import sqlite3
import os

db_path = "backend/maintenance.db"
if not os.path.exists(db_path):
    db_path = "maintenance.db"

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Tables ---")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [t[0] for t in cursor.fetchall()]
for t in tables:
    print(t)

print("\n--- Material Requirements vs Stock ---")
# Try to find work orders with material shortages
# Based on ExecutionPlanModal.tsx, it looks at mat.available_quantity vs mat.recommended_quantity
# These fields must be returned by /api/execution-plan/{work_order_id}

# Let's check the schema of task_material_linkage if it exists
if "task_material_linkage" in tables:
    cursor.execute("PRAGMA table_info(task_material_linkage)")
    print("\ntask_material_linkage schema:", cursor.fetchall())

if "material_inventory" in tables:
    cursor.execute("PRAGMA table_info(material_inventory)")
    print("\nmaterial_inventory schema:", cursor.fetchall())
elif "material_price" in tables:
    cursor.execute("PRAGMA table_info(material_price)")
    print("\nmaterial_price schema:", cursor.fetchall())

conn.close()
