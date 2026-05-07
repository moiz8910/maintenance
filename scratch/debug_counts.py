import sqlite3
DB_PATH = "backend/maintenance.db"
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("SELECT COUNT(*) FROM material_master")
print(f"Material Master Count: {cursor.fetchone()[0]}")
cursor.execute("SELECT COUNT(*) FROM work_order WHERE LOWER(work_order_status) = 'pending'")
print(f"Pending Work Orders: {cursor.fetchone()[0]}")
conn.close()
