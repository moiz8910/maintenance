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
    try:
        cursor.execute("ALTER TABLE incident_events ADD COLUMN incident_type TEXT")
    except:
        pass # Already exists
        
    cursor.execute("DELETE FROM incident_events")
    
    # Fetch some real WOs and Assets for linkage from task items
    cursor.execute("SELECT work_order, asset FROM work_order_task_item LIMIT 30")
    wo_pool = cursor.fetchall()
    
    if not wo_pool:
        # Fallback if task items are empty
        wo_pool = [('WO-0001', 'AST-0101')]
    
    incidents_data = []
    types = ['Near Miss', 'LTI', 'First Aid']
    
    # Guarantee 8 incidents with real linkages
    for i in range(1, 9):
        wo_id, asset_id = random.choice(wo_pool)
        inc_type = 'LTI' if i == 1 else random.choice(types)
        incidents_data.append((f'INC-2024-00{i}', wo_id, asset_id, inc_type))
        
    for row in incidents_data:
        cursor.execute("INSERT INTO incident_events (id, work_order, asset, incident_type) VALUES (?, ?, ?, ?)", row)
        
    conn.commit()
    conn.close()
    print(f"Allocated {len(incidents_data)} safety incidents with real WO/Asset linkages.")
    print("Database update complete!")

if __name__ == "__main__":
    update_data()
