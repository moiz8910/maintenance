import sqlite3
conn = sqlite3.connect("backend/maintenance.db")
cursor = conn.cursor()
cursor.execute("SELECT id, work_order_status, repair_type FROM work_order WHERE work_order_status = 'Diagnostic'")
rows = cursor.fetchall()
print(f"Found {len(rows)} Diagnostic Work Orders:")
for row in rows:
    print(row)
conn.close()
