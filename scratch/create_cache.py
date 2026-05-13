import sqlite3
import os

db_path = "backend/maintenance.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Creating Advice Cache Table ---")
cursor.execute("""
    CREATE TABLE IF NOT EXISTS execution_advice_cache (
        wo_id TEXT PRIMARY KEY,
        advice TEXT,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
conn.commit()
print("Success.")
conn.close()
