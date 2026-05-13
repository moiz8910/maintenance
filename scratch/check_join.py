import sqlite3
def check():
    conn = sqlite3.connect('backend/maintenance.db')
    cursor = conn.cursor()
    cursor.execute("SELECT mm.id, mp.material FROM material_master mm JOIN material_price mp ON mm.id = mp.material LIMIT 5")
    print("Join results:", cursor.fetchall())
    conn.close()
if __name__ == "__main__":
    check()
