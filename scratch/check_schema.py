import sqlite3
DB_PATH = "backend/maintenance.db"
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(task_material_linkage)")
for col in cursor.fetchall():
    print(col)
conn.close()
