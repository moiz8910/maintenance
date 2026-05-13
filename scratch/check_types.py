import sqlite3
conn = sqlite3.connect("backend/maintenance.db")
cursor = conn.cursor()
cursor.execute("SELECT repair_type, COUNT(*) FROM work_order GROUP BY repair_type")
print("Repair Type Distribution:")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]}")
conn.close()
