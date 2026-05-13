import sqlite3
conn = sqlite3.connect('backend/maintenance.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute('SELECT a.name, p.name as parent_name FROM asset a JOIN asset p ON a.parent_asset = p.id LIMIT 10')
for row in cursor.fetchall():
    print(f"{row['name']} IS CHILD OF {row['parent_name']}")
conn.close()
