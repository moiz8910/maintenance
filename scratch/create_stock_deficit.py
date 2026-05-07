import sqlite3

DB_PATH = "backend/maintenance.db"
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Find 2 pending WOs that have materials
cursor.execute("""
    SELECT w.id, m.material_used, m.quantity_used, mm.available_quantity
    FROM work_order w
    JOIN work_order_task_item woti ON woti.work_order = w.id
    JOIN task_material_linkage m ON m.work_order_task_item = woti.id
    JOIN material_master mm ON m.material_used = mm.id
    WHERE LOWER(w.work_order_status) = 'pending'
    LIMIT 2
""")
rows = cursor.fetchall()

if len(rows) < 2:
    print("Not enough pending WOs with materials found.")
else:
    for row in rows:
        wo_id = row['id']
        mat_id = row['material_used']
        qty_needed = row['quantity_used']
        # Set available to 1 less than needed (or 0 if needed is 1)
        new_avail = max(0, qty_needed - 1)
        cursor.execute("UPDATE material_master SET available_quantity = ? WHERE id = ?", (new_avail, mat_id))
        print(f"Updated material {mat_id} for WO {wo_id}: Available {new_avail} < Needed {qty_needed}")

conn.commit()
conn.close()
