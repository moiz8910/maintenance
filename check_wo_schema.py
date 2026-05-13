import sqlite3
conn = sqlite3.connect('backend/maintenance.db')
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(work_order)")
for r in cursor.fetchall():
    print(r)
conn.close()
