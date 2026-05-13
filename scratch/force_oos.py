import sqlite3
conn = sqlite3.connect('backend/maintenance.db')
cursor = conn.cursor()
# Set some spares to 0 stock
cursor.execute("UPDATE on_hand_inventory SET stock_available_on_hand = 0 WHERE material IN (SELECT id FROM material_master WHERE material_type = 'Spares' LIMIT 5)")
conn.commit()
print(f"Updated {cursor.rowcount} materials to 0 stock.")
# Verify
cursor.execute("SELECT COUNT(*) FROM on_hand_inventory WHERE stock_available_on_hand = 0")
print(f"Current OOS count in DB: {cursor.fetchone()[0]}")
conn.close()
