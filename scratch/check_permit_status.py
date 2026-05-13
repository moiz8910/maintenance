import sqlite3
import os

DB_PATH = "maintenance.db"
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("SELECT DISTINCT status FROM work_permit")
rows = cursor.fetchall()
print([row[0] for row in rows])
conn.close()
