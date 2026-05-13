import sqlite3

def check_data():
    conn = sqlite3.connect('backend/maintenance.db')
    cursor = conn.cursor()
    
    print("--- Work Order Status Counts ---")
    try:
        cursor.execute("SELECT work_order_status, COUNT(*) FROM work_order GROUP BY work_order_status")
        for row in cursor.fetchall():
            print(f"{row[0]}: {row[1]}")
    except Exception as e:
        print(f"Error checking status: {e}")
        
    print("\n--- Work Order Samples ---")
    try:
        cursor.execute("SELECT id, work_order_status, repair_description FROM work_order LIMIT 10")
        for row in cursor.fetchall():
            print(row)
    except Exception as e:
        print(f"Error checking samples: {e}")
        
    conn.close()

if __name__ == "__main__":
    check_data()
