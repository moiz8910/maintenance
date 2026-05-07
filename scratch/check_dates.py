import sqlite3
from datetime import datetime

DB_PATH = "backend/maintenance.db"

def check():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("--- Work Order Status & Dates ---")
    cursor.execute("SELECT id, work_order_status, work_order_open_day FROM work_order LIMIT 10")
    for row in cursor.fetchall():
        print(f"{row['id']} | {row['work_order_status']} | {row['work_order_open_day']}")

    print("\n--- Task Item Dates ---")
    cursor.execute("SELECT work_order, work_order_task_item_open_day, COUNT(*) as count FROM work_order_task_item GROUP BY work_order_task_item_open_day LIMIT 10")
    for row in cursor.fetchall():
        print(f"Date: {row['work_order_task_item_open_day']} | Tasks: {row['count']}")

    print("\n--- Material Linkage Count ---")
    cursor.execute("SELECT COUNT(*) FROM task_material_linkage")
    print(f"Total material links: {cursor.fetchone()[0]}")

    print("\n--- Permit Status Distribution ---")
    cursor.execute("SELECT status, COUNT(*) FROM work_permit GROUP BY status")
    for row in cursor.fetchall():
        print(f"{row[0]}: {row[1]}")

    conn.close()

if __name__ == "__main__":
    check()
