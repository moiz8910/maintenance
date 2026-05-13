import sqlite3
def check():
    conn = sqlite3.connect('backend/maintenance.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    query = """
        SELECT 
            pr.id, 
            mm.description as material_name, 
            pr.status,
            mp.price_per_unit as unit_price
        FROM purchase_requisition pr
        JOIN material_master mm ON pr.material = mm.id
        LEFT JOIN material_price mp ON mm.id = mp.material
        WHERE LOWER(pr.status) = 'pending'
    """
    cursor.execute(query)
    rows = [dict(row) for row in cursor.fetchall()]
    print(rows[:2])
    conn.close()
if __name__ == "__main__":
    check()
