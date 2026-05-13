import sqlite3
conn = sqlite3.connect('backend/maintenance.db')
cursor = conn.cursor()
cursor.execute("SELECT mm.id, mm.material_type, oh.stock_available_on_hand FROM material_master mm JOIN on_hand_inventory oh ON mm.id = oh.material WHERE mm.id IN ('MAT-0001', 'MAT-0006', 'MAT-0011')")
print("Target Spares Stock:", cursor.fetchall())
cursor.execute("SELECT COUNT(*) FROM material_master mm JOIN on_hand_inventory oh ON mm.id = oh.material WHERE mm.material_type = 'Spares' AND oh.stock_available_on_hand <= 0")
print("Total OOS Spares:", cursor.fetchone()[0])
conn.close()
