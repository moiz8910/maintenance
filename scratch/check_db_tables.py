import sqlite3
import os

DB_PATH = "backend/maintenance.db"

def check():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: {DB_PATH} does not exist.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables in database:")
    for t in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {t[0]}")
        count = cursor.fetchone()[0]
        print(f"  {t[0]}: {count} rows")
    conn.close()

if __name__ == "__main__":
    check()
