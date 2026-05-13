import sqlite3
import os
import json
import random
from datetime import datetime, timedelta
from google import genai
from dotenv import load_dotenv

load_dotenv()

DB_PATH = "backend/maintenance.db"
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

def follow_rule_10():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 1. Fetch Diagnostic Work Orders
    cursor.execute("""
        SELECT w.id, w.repair_description, w.repair_type, w.asset_id, a.name as asset_name
        FROM work_order w
        LEFT JOIN asset a ON w.asset_id = a.id
        WHERE LOWER(w.work_order_status) = 'diagnostic'
    """)
    diagnostic_wos = cursor.fetchall()

    if not diagnostic_wos:
        print("No work orders found in Diagnostic Analysis queue.")
        return

    print(f"Processing {len(diagnostic_wos)} work orders from Diagnostic queue...")

    # Fetch reference data for assignment
    cursor.execute("SELECT id, discipline_trade FROM technician_engineer")
    technicians = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT id, description FROM material_master")
    materials = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT id FROM contract_services")
    contracts = [r[0] for r in cursor.fetchall()]

    cursor.execute("SELECT id, description, discipline FROM task")
    all_tasks = [dict(r) for r in cursor.fetchall()]

    for wo in diagnostic_wos:
        wo_id = wo['id']
        description = wo['repair_description']
        asset_id = wo['asset_id']
        asset_name = wo['asset_name']

        print(f"  -> Processing {wo_id} ({description})...")

        # 2. Simulate GEN AI Analysis for Tasks, Materials, Manpower
        prompt = f"""
        Act as a Maintenance Expert for an Aluminum Smelter.
        Analyze this breakdown: {description} for Asset: {asset_name} ({asset_id}).
        
        Suggest 2-3 specific maintenance tasks, required materials, and required manpower disciplines.
        
        Return ONLY valid JSON:
        {{
          "tasks": [
            {{
              "desc": "Task description",
              "discipline": "Mechanical/Electrical/Instrumentation",
              "materials": ["Material Name 1", "Material Name 2"],
              "manpower": ["Discipline 1"]
            }}
          ]
        }}
        """
        
        try:
            response = client.models.generate_content(model="gemini-1.5-flash", contents=prompt)
            plan = json.loads(response.text.replace("```json", "").replace("```", "").strip())
        except Exception as e:
            print(f"    [AI Error] {e}. Using fallback planning.")
            plan = {
                "tasks": [
                    {
                        "desc": f"Technical inspection of {asset_name}",
                        "discipline": "Mechanical",
                        "materials": [random.choice(materials)['description']],
                        "manpower": ["Mechanical"]
                    },
                    {
                        "desc": f"Component replacement/repair for {wo_id}",
                        "discipline": "Electrical",
                        "materials": [random.choice(materials)['description']],
                        "manpower": ["Electrical"]
                    }
                ]
            }

        # 3. Apply the plan to the DB
        # A. Update WO status to Pending
        cursor.execute("UPDATE work_order SET work_order_status = 'Pending' WHERE id = ?", (wo_id,))

        # B. Insert Task Items and link resources
        today = datetime.now().strftime("%d-%m-%y")
        open_time = "08:00"
        
        for i, t_data in enumerate(plan['tasks']):
            task_item_id = f"WOT-{wo_id[3:]}-{i+1}"
            
            # Find a matching task template if possible, else pick random
            matching_tasks = [t for t in all_tasks if t['discipline'].lower() == t_data['discipline'].lower()]
            task_template_id = random.choice(matching_tasks)['id'] if matching_tasks else random.choice(all_tasks)['id']

            cursor.execute("""
                INSERT INTO work_order_task_item 
                (id, work_order, asset, task, work_order_task_item_open_day, work_order_task_item_open_time, work_order_task_item_finish_day, work_order_task_item_finish_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (task_item_id, wo_id, asset_id, task_template_id, today, open_time, today, "16:00"))

            # Manpower Linkage
            discipline = t_data['discipline']
            matching_techs = [t for t in technicians if t['discipline_trade'].lower() == discipline.lower()]
            assigned_tech = random.choice(matching_techs if matching_techs else technicians)
            
            cursor.execute("""
                INSERT INTO technician_engineer_linkage 
                (work_order_task_item, technician_engineer_engaged, technician_service_period)
                VALUES (?, ?, ?)
            """, (task_item_id, assigned_tech['id'], 4))

            # Material Linkage
            for mat_name in t_data['materials']:
                # Find matching material id or pick random
                matching_mats = [m for m in materials if mat_name.lower() in m['description'].lower()]
                assigned_mat = random.choice(matching_mats if matching_mats else materials)
                
                cursor.execute("""
                    INSERT INTO task_material_linkage 
                    (id, material_used, work_order_task_item, quantity_used, material_price)
                    VALUES (?, ?, ?, ?, ?)
                """, (f"TML-{task_item_id}-{random.randint(100, 999)}", assigned_mat['id'], task_item_id, 1, 10))

            # Contract Linkage (only for first task to avoid duplication on WO level if it was per task)
            if i == 0 and contracts:
                cursor.execute("""
                    INSERT INTO contract_linkage 
                    (contract_engaged, work_order_task_item, contract_value_expended)
                    VALUES (?, ?, ?)
                """, (random.choice(contracts), task_item_id, 500))

            # Permit Generation (for first task)
            if i == 0:
                permit_id = f"WP-{wo_id[3:]}-{random.randint(10, 99)}"
                cursor.execute("""
                    INSERT INTO work_permit 
                    (id, description, type, work_order_task_item, work_permit_open_day, work_permit_open_time, work_permit_end_day, work_permit_end_time, status, status_change_timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (permit_id, f"Permit for {t_data['desc']}", "General Maintenance", task_item_id, today, open_time, today, "17:00", "Available", "08:30"))

        print(f"    [OK] {wo_id} moved to Pending with {len(plan['tasks'])} tasks and resources assigned.")

    conn.commit()
    conn.close()
    print("\nRule 10 processing complete.")

if __name__ == "__main__":
    follow_rule_10()
