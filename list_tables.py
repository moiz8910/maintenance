import sqlite3
conn = sqlite3.connect('backend/maintenance.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
print([r[0] for r in cursor.fetchall()])
conn.close()
