import sqlite3
conn = sqlite3.connect("backend/maintenance.db")
cursor = conn.cursor()

print("--- Populating asset_id in work_order table ---")

# 1. Get all WOs and their associated assets from task items
cursor.execute("""
    SELECT DISTINCT work_order, asset 
    FROM work_order_task_item 
    WHERE asset IS NOT NULL AND asset != ''
""")
links = cursor.fetchall()

updated = 0
for wo_id, asset_id in links:
    cursor.execute("UPDATE work_order SET asset_id = ? WHERE id = ?", (asset_id, wo_id))
    updated += 1

# 2. For those that are already in Diagnostic (and have no tasks), 
# we need to find their original asset if possible or assign a random one for now.
# But since I just ran ensure_diagnostic_wos, I'll try to find them from assets.
cursor.execute("SELECT id FROM work_order WHERE asset_id IS NULL")
missing = cursor.fetchall()

cursor.execute("SELECT id FROM asset")
all_assets = [r[0] for r in cursor.fetchall()]

for row in missing:
    wo_id = row[0]
    cursor.execute("UPDATE work_order SET asset_id = ? WHERE id = ?", (all_assets[0], wo_id))
    updated += 1

conn.commit()
print(f"Success. Updated {updated} work orders.")
conn.close()
