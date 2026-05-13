import sqlite3
import os

def check():
    conn = sqlite3.connect('backend/maintenance.db')
    cursor = conn.cursor()
    cursor.execute("SELECT work_order_status, COUNT(*) FROM work_order GROUP BY work_order_status")
    for row in cursor.fetchall():
        print(f"{row[0]}: {row[1]}")
    conn.close()

if __name__ == "__main__":
    check()
