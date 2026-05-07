import sqlite3
import os
import sys
from services.agent_manager import generate_with_retry

# Robust DB Path
DB_PATH = os.path.join("backend", "maintenance.db")

def enrich_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Fetch Work Orders
    cursor.execute("SELECT id, repair_description FROM work_order")
    work_orders = cursor.fetchall()
    
    print(f"Processing {len(work_orders)} Work Orders...")
    
    for wo_id, desc in work_orders:
        prompt = f"""
        You are a senior maintenance expert at Vedanta Jharsuguda Aluminum Smelter.
        Convert the following vague work order description into a technical, professional, and detailed description 
        that a Vedanta maintenance team would find actionable and relatable. 
        Use specific terminology related to aluminum smelting (e.g., Potline, Green Anode Plant, Rodding Shop, Casthouse, Rectifiers, GTC, FTC).
        
        Original Description: {desc}
        
        New Description:
        """
        try:
            new_desc = generate_with_retry(prompt=prompt, system_prompt="Keep it technical and concise (max 2 sentences).")
            cursor.execute("UPDATE work_order SET repair_description = ? WHERE id = ?", (new_desc.strip(), wo_id))
            print(f"Updated WO {wo_id}")
        except Exception as e:
            print(f"Error updating WO {wo_id}: {e}")
    
    # 2. Fetch Tasks (Base Task Library)
    cursor.execute("SELECT id, description, discipline FROM task")
    tasks = cursor.fetchall()
    
    print(f"\nProcessing {len(tasks)} Tasks...")
    
    for t_id, desc, disc in tasks:
        prompt = f"""
        You are a senior maintenance expert at Vedanta Jharsuguda Aluminum Smelter.
        Convert the following vague maintenance task description into a technical, professional, and detailed description 
        specific to the aluminum industry context (Vedanta Jharsuguda).
        Discipline: {disc}
        Original Description: {desc}
        
        New Description:
        """
        try:
            new_desc = generate_with_retry(prompt=prompt, system_prompt="Keep it technical and concise (max 1 sentence).")
            cursor.execute("UPDATE task SET description = ? WHERE id = ?", (new_desc.strip(), t_id))
            print(f"Updated Task {t_id}")
        except Exception as e:
            print(f"Error updating Task {t_id}: {e}")

    conn.commit()
    conn.close()
    print("\nData enrichment complete.")

if __name__ == "__main__":
    # Ensure we are in the right directory
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        sys.exit(1)
    enrich_data()
