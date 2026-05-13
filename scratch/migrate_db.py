import sqlite3
import os

db_path = "backend/maintenance.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Migration: Adding lead_time ---")
try:
    cursor.execute("ALTER TABLE task_material_linkage ADD COLUMN lead_time INTEGER")
    conn.commit()
    print("Success: lead_time column added.")
except sqlite3.OperationalError as e:
    print(f"Note: {e}")

# Also, let's fill it with some default values so the backend doesn't hang on Gemini
cursor.execute("UPDATE task_material_linkage SET lead_time = 7 WHERE lead_time IS NULL")
conn.commit()
print("Initialized NULL lead_times to 7.")

conn.close()
