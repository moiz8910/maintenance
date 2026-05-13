import sqlite3
import os

db_path = "backend/maintenance.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

wo_id = 'WO-0003'
print(f"--- Data for {wo_id} ---")

# Linkage
cursor.execute("""
    SELECT m.material_used, mm.description, m.quantity_used, t.id as task_item_id
    FROM task_material_linkage m
    JOIN work_order_task_item t ON m.work_order_task_item = t.id
    JOIN material_master mm ON m.material_used = mm.id
    WHERE t.work_order = ?
""", (wo_id,))
linkages = cursor.fetchall()
for link in linkages:
    print(f"Material: {link['description']} ({link['material_used']}) | Required: {link['quantity_used']}")
    
    # Inventory
    cursor.execute("SELECT * FROM on_hand_inventory WHERE material = ?", (link['material_used'],))
    inv = cursor.fetchall()
    total_avail = sum(i['stock_available_on_hand'] for i in inv)
    print(f"  Available: {total_avail} (Entries: {len(inv)})")
    for i in inv:
        print(f"    - Plant: {i['plant']}, Qty: {i['stock_available_on_hand']}")

conn.close()
