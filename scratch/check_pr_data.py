import sqlite3
import os

DB_PATH = "backend/maintenance.db"
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute("SELECT * FROM purchase_requisition LIMIT 5")
print([dict(row) for row in cursor.fetchall()])
conn.close()
