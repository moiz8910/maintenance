import sqlite3
import os

db_path = os.path.join('backend', 'maintenance.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
try:
    cursor.execute("SELECT asset_id FROM work_order LIMIT 1")
    print("Column asset_id exists.")
except Exception as e:
    print(f"Error: {e}")
conn.close()
