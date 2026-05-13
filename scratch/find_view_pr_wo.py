import sqlite3
import os

db_path = "backend/maintenance.db"
if not os.path.exists(db_path):
    db_path = "maintenance.db"

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

query = """
    SELECT t.work_order, mm.description as material, m.quantity_used as recommended_quantity,
           COALESCE(SUM(inv.stock_available_on_hand), 0) as available_quantity,
           w.work_order_status
    FROM task_material_linkage m 
    JOIN work_order_task_item t ON m.work_order_task_item = t.id 
    JOIN work_order w ON t.work_order = w.id
    JOIN material_master mm ON m.material_used = mm.id
    LEFT JOIN on_hand_inventory inv ON inv.material = mm.id
    WHERE LOWER(w.work_order_status) = 'pending'
    GROUP BY t.work_order, mm.id, m.quantity_used, mm.description
    HAVING recommended_quantity > available_quantity
    LIMIT 10
"""

cursor.execute(query)
results = cursor.fetchall()

print("Pending Work Orders with Material Shortage (VIEW PR):")
for row in results:
    print(f"WO: {row['work_order']} | Status: {row['work_order_status']} | Material: {row['material']} | Required: {row['recommended_quantity']} | Available: {row['available_quantity']}")

conn.close()
