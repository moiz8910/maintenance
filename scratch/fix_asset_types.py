import sqlite3
import os

db_path = "backend/maintenance.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check schema
cursor.execute("PRAGMA table_info(asset)")
asset_cols = [c[1] for c in cursor.fetchall()]
print(f"Asset columns: {asset_cols}")

cursor.execute("PRAGMA table_info(asset_type)")
type_cols = [c[1] for c in cursor.fetchall()]
print(f"Asset type columns: {type_cols}")

# Check sample data
cursor.execute("SELECT id, name, type FROM asset LIMIT 5")
print(f"Sample assets: {cursor.fetchall()}")

cursor.execute("SELECT id, type FROM asset_type LIMIT 5")
print(f"Sample asset types: {cursor.fetchall()}")

# Fix: If asset.type contains strings that match asset_type.type, 
# but the join in main.py expects IDs, we might need to update asset.type to IDs.
# HOWEVER, the query in main.py is:
# LEFT JOIN asset_type at ON a.type = at.id

# Let's see if we can find matches between asset.type (string) and asset_type.type (string)
cursor.execute("""
    SELECT a.id, a.type, at.id 
    FROM asset a 
    JOIN asset_type at ON a.type = at.type 
    LIMIT 10
""")
matches = cursor.fetchall()
print(f"Matches found by string: {len(matches)}")
for m in matches:
    print(m)

# If there are matches, it means asset.type has the descriptive string.
# We should update asset.type to be the ID if we want the join to work as currently written in main.py.
# OR we update main.py to join on strings. Joining on IDs is generally better for DB performance.

if matches:
    print("Updating asset.type to use IDs instead of strings...")
    cursor.execute("""
        UPDATE asset 
        SET type = (SELECT id FROM asset_type WHERE asset_type.type = asset.type)
        WHERE type IN (SELECT type FROM asset_type)
    """)
    print(f"Updated {cursor.rowcount} assets.")
    conn.commit()
else:
    print("No matches found by string. Maybe names don't match exactly.")

conn.close()
