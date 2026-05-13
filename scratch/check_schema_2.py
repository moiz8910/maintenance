import sqlite3
import os

db_path = "backend/maintenance.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(task_material_linkage)")
cols = cursor.fetchall()
print("task_material_linkage:", cols)

# Also check material_master just in case
cursor.execute("PRAGMA table_info(material_master)")
print("material_master:", cursor.fetchall())

conn.close()
