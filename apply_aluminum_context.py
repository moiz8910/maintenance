import os
import json
import sqlite3
import openai
import random
import time
from dotenv import load_dotenv

load_dotenv()

client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

DB_PATH = os.path.join("backend", "maintenance.db")

def call_openai(prompt):
    max_retries = 3
    for i in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"  [Retry {i+1}] Error: {e}")
            time.sleep(2)
    return None

def generate_context():
    print("[Stage 1] Generating Aluminum Industry Context...")
    
    # 1. Asset Types
    print("  -> Generating Asset Types...")
    types_data = call_openai("""
        Generate a JSON object with a key 'asset_types' containing 15-20 distinct area names 
        for an Aluminium Smelter (e.g. Potline, Carbon Plant, Casthouse, Alumina Handling, etc.).
    """)
    asset_types = types_data['asset_types']
    
    # 2. Assets (Batch 1: 100)
    print("  -> Generating Assets (1-100)...")
    assets_1 = call_openai(f"""
        Generate a JSON object with a key 'assets' containing 100 assets for an Aluminium Smelter.
        Use these types: {asset_types}.
        Each asset: id (AST-001 to AST-100), name, type, location, criticality (1-5), 
        mttr (hours, 1 decimal), mtbf (days, 1 decimal), unplanned_dt (hours, 1 decimal).
    """)
    
    # 3. Assets (Batch 2: 100)
    print("  -> Generating Assets (101-200)...")
    assets_2 = call_openai(f"""
        Generate a JSON object with a key 'assets' containing 100 assets for an Aluminium Smelter.
        Use these types: {asset_types}.
        Each asset: id (AST-101 to AST-200), name, type, location, criticality (1-5), 
        mttr (hours, 1 decimal), mtbf (days, 1 decimal), unplanned_dt (hours, 1 decimal).
    """)
    
    # 4. Tasks (Batch 1: 100)
    print("  -> Generating Tasks (1-100)...")
    tasks_1 = call_openai(f"""
        Generate a JSON object with a key 'tasks' containing 100 unique and logical maintenance tasks.
        Use these types: {asset_types}.
        Each task: description, discipline (Mechanical, Electrical, Instrumentation, Civil), asset_type.
    """)
    
    # 5. Tasks (Batch 2: 100)
    print("  -> Generating Tasks (101-200)...")
    tasks_2 = call_openai(f"""
        Generate a JSON object with a key 'tasks' containing 100 unique and logical maintenance tasks.
        Use these types: {asset_types}.
        Each task: description, discipline (Mechanical, Electrical, Instrumentation, Civil), asset_type.
    """)
    
    all_assets = assets_1['assets'] + assets_2['assets']
    all_tasks = tasks_1['tasks'] + tasks_2['tasks']
    
    return {
        'asset_types': asset_types,
        'assets': all_assets,
        'tasks': all_tasks
    }

def update_db(data):
    print("[Stage 2] Updating Database with Chunked Context...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("DELETE FROM asset_type")
        cursor.execute("DELETE FROM asset")
        cursor.execute("DELETE FROM task")
        
        # 1. Asset Types
        type_map = {}
        for i, at in enumerate(data['asset_types']):
            name = at if isinstance(at, str) else at.get('name')
            cursor.execute("INSERT INTO asset_type (id, type) VALUES (?, ?)", (i+1, name))
            type_map[name] = i+1
            
        # 2. Assets
        asset_ids = [a['id'] for a in data['assets']]
        num_with_parents = int(len(asset_ids) * 0.3)
        parent_map = {}
        assets_needing_parents = random.sample(asset_ids, num_with_parents)
        for aid in assets_needing_parents:
            potential_parents = [pid for pid in asset_ids if pid != aid]
            parent_map[aid] = random.choice(potential_parents)

        for asset in data['assets']:
            type_id = type_map.get(asset['type'], 1)
            parent_id = parent_map.get(asset['id'])
            
            cursor.execute("""
                INSERT INTO asset (
                    id, name, type, location, criticality, parent_asset,
                    mean_time_to_repairmttr_value, mean_time_to_repairmttr_uom,
                    mean_time_between_failuresmtbf, mean_time_between_failuresmtbf_uom,
                    unplanned_downtime, unplanned_downtime_uom
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                asset['id'], asset['name'], type_id, asset['location'], asset['criticality'], parent_id,
                round(float(asset.get('mttr', 4.0)), 1), 'Hours',
                round(float(asset.get('mtbf', 90.0)), 1), 'Days',
                round(float(asset.get('unplanned_dt', 10.0)), 1), 'Hours'
            ))
            
        # 3. Tasks
        for i, task in enumerate(data['tasks']):
            type_id = type_map.get(task['asset_type'], 1)
            cursor.execute("""
                INSERT INTO task (id, description, discipline, asset_type)
                VALUES (?, ?, ?, ?)
            """, (i+1, task['description'], task['discipline'], type_id))
            
        # 4. Contextualize Work Order Descriptions
        cursor.execute("SELECT id FROM work_order")
        wo_ids = [r[0] for r in cursor.fetchall()]
        
        for wo_id in wo_ids:
            cursor.execute("SELECT description FROM task ORDER BY RANDOM() LIMIT 1")
            res = cursor.fetchone()
            if res:
                new_desc = res[0]
                cursor.execute("UPDATE work_order SET repair_description = ? WHERE id = ?", (new_desc, wo_id))
            
        conn.commit()
        print(f"[Success] Processed {len(data['asset_types'])} types, {len(data['assets'])} assets, and {len(data['tasks'])} tasks.")
        
    except Exception as e:
        conn.rollback()
        print(f"[Error] Database update failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    context_data = generate_context()
    update_db(context_data)
