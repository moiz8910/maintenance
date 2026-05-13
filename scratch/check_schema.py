import sqlite3
import os

DB_PATH = "backend/maintenance.db"
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(purchase_requisition)")
print([row[1] for row in cursor.fetchall()])
conn.close()
