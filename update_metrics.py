import sqlite3
import random
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "maintenance.db")

def update_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Unplanned Downtime: ~200 hours across 25 assets
    cursor.execute("UPDATE asset SET unplanned_downtime = 0")
    
    cursor.execute("SELECT id FROM asset")
    all_assets = [row[0] for row in cursor.fetchall()]
    
    selected_assets = random.sample(all_assets, min(30, len(all_assets)))
    
    hours_list = [15] * len(selected_assets)
    for _ in range(100):
        idx1 = random.randint(0, len(selected_assets) - 1)
        idx2 = random.randint(0, len(selected_assets) - 1)
        if hours_list[idx1] > 2:
            hours_list[idx1] -= 2
            hours_list[idx2] += 2
            
    for i, asset_id in enumerate(selected_assets):
        cursor.execute("UPDATE asset SET unplanned_downtime = ? WHERE id = ?", (hours_list[i], asset_id))
    
    print(f"Allocated {sum(hours_list)} hours of unplanned downtime across {len(selected_assets)} random assets.")

    # 2. Safety Statistics: 8 incidents, LTI is minimum 1
    cursor.execute("DELETE FROM incident_events")
    
    types = ['Near Miss', 'LTI', 'First Aid']
    
    incidents = ['LTI'] # Guarantee at least 1 LTI
    for _ in range(7):
        incidents.append(random.choice(types))
        
    # Dynamically find the correct column name for "incident type"
    cursor.execute("PRAGMA table_info(incident_events)")
    columns = [row[1] for row in cursor.fetchall()]
    
    type_col = None
    for possible_name in ['incident_type', 'type', 'event_type', 'incident_category', 'category', 'incident_class']:
        if possible_name in columns:
            type_col = possible_name
            break
            
    if not type_col:
        # Fallback if no specific column is found, just insert into the first available string column
        type_col = columns[1] if len(columns) > 1 else columns[0]

    for i, inc_type in enumerate(incidents):
        cursor.execute(f"""
            INSERT INTO incident_events ({type_col}) VALUES (?)
        """, (inc_type,))
        
    conn.commit()
    conn.close()
    print("Allocated 8 safety incidents (Near Miss, LTI, First Aid).")
    print("Database update complete!")

if __name__ == "__main__":
    update_data()
