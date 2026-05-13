import sqlite3
import os

db_path = "backend/maintenance.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Enforce Rule 7: Work permit status cannot be 'Unavailable' if start and end dates are available.
cursor.execute("""
    UPDATE work_permit 
    SET status = 'Available' 
    WHERE status = 'Unavailable' 
      AND work_permit_open_day IS NOT NULL 
      AND work_permit_open_day != ''
      AND work_permit_end_day IS NOT NULL 
      AND work_permit_end_day != ''
""")

print(f"Updated {cursor.rowcount} work permits to 'Available' where dates were present.")

conn.commit()
conn.close()
