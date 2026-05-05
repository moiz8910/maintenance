import sqlite3
import random

def fix_disciplines():
    db_path = "backend/maintenance.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Auditing resource assignments...")
    
    # Get all linkages and their current disciplines
    query = """
        SELECT 
            tel.rowid,
            tel.work_order_task_item,
            tel.technician_engineer_engaged,
            t.discipline as task_discipline,
            te.discipline_trade as tech_discipline
        FROM technician_engineer_linkage tel
        JOIN work_order_task_item woti ON tel.work_order_task_item = woti.id
        JOIN task t ON woti.task = t.id
        JOIN technician_engineer te ON tel.technician_engineer_engaged = te.id
    """
    cursor.execute(query)
    linkages = cursor.fetchall()
    
    inconsistencies = 0
    for row in linkages:
        row_id, woti_id, tech_id, task_disc, tech_disc = row
        
        # Simple string comparison (handle case and stripping)
        if (task_disc or "").strip().lower() != (tech_disc or "").strip().lower():
            # Find a replacement
            cursor.execute("SELECT id FROM technician_engineer WHERE LOWER(discipline_trade) = LOWER(?)", (task_disc,))
            valid_techs = [r[0] for r in cursor.fetchall()]
            
            if valid_techs:
                new_tech = random.choice(valid_techs)
                cursor.execute("UPDATE technician_engineer_linkage SET technician_engineer_engaged = ? WHERE rowid = ?", (new_tech, row_id))
                inconsistencies += 1
            else:
                print(f"Warning: No technician found for discipline '{task_disc}' to replace in linkage {row_id}")

    conn.commit()
    conn.close()
    print(f"Audited {len(linkages)} linkages. Rectified {inconsistencies} inconsistencies.")

if __name__ == "__main__":
    fix_disciplines()
