import sqlite3
def check():
    conn = sqlite3.connect('backend/maintenance.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM material_master WHERE description LIKE '%Dial gauge%' LIMIT 5")
    print("Master IDs:", cursor.fetchall())
    cursor.execute("SELECT material, price_per_unit FROM material_price WHERE material LIKE '%MAT%' LIMIT 5")
    print("Price Data:", cursor.fetchall())
    cursor.execute("SELECT material FROM purchase_requisition LIMIT 5")
    print("PR Data:", cursor.fetchall())
    conn.close()
if __name__ == "__main__":
    check()
