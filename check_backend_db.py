import sqlite3
import os

db_path = os.path.join('backend', 'maintenance.db')
if not os.path.exists(db_path):
    print(f"Database {db_path} not found.")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"Tables: {tables}")
        
        cursor.execute("SELECT * FROM incident_events")
        rows = cursor.fetchall()
        print(f"Incident Events Count: {len(rows)}")
        for row in rows:
            print(row)
    except Exception as e:
        print(f"Error: {e}")
    conn.close()
