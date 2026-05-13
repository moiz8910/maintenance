import sqlite3
import os

DB_PATH = "backend/maintenance.db"

def ensure_pr_wos():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 1. Check how many pending WOs currently have material shortage
    query = """
        SELECT t.work_order
        FROM task_material_linkage m 
        JOIN work_order_task_item t ON m.work_order_task_item = t.id 
        JOIN work_order w ON t.work_order = w.id
        JOIN material_master mm ON m.material_used = mm.id
        LEFT JOIN on_hand_inventory inv ON inv.material = mm.id
        WHERE LOWER(w.work_order_status) = 'pending'
        GROUP BY t.work_order, mm.id, m.quantity_used
        HAVING m.quantity_used > COALESCE(SUM(inv.stock_available_on_hand), 0)
    """
    
    cursor.execute(query)
    results = cursor.fetchall()
    count = len(set(row['work_order'] for row in results))
    
    print(f"Current pending WOs with PR needed: {count}")
    
    if count >= 2:
        print("[OK] At least 2 PR-required pending WOs exist.")
        conn.close()
        return

    # 2. If less than 2, find some pending WOs and create shortages for them
    needed = 2 - count
    print(f"Ensuring {needed} more PR-required WOs...")
    
    # Find pending WOs that don't already have shortages
    existing_pr_wos = set(row['work_order'] for row in results)
    
    cursor.execute("SELECT id FROM work_order WHERE LOWER(work_order_status) = 'pending'")
    pending_wos = [row['id'] for row in cursor.fetchall() if row['id'] not in existing_pr_wos]
    
    for i in range(min(needed, len(pending_wos))):
        wo_id = pending_wos[i]
        
        # Get a task item for this WO
        cursor.execute("SELECT id FROM work_order_task_item WHERE work_order = ? LIMIT 1", (wo_id,))
        task_item = cursor.fetchone()
        if not task_item: continue
        ti_id = task_item['id']
        
        # Get a material
        cursor.execute("SELECT id FROM material_master LIMIT 1 OFFSET ?", (random.randint(0, 10),))
        mat = cursor.fetchone()
        if not mat: continue
        mat_id = mat['id']
        
        # Ensure shortage: quantity_used > available
        cursor.execute("SELECT SUM(stock_available_on_hand) FROM on_hand_inventory WHERE material = ?", (mat_id,))
        available = cursor.fetchone()[0] or 0
        required = available + 5
        
        # Insert or update linkage
        cursor.execute("SELECT id FROM task_material_linkage WHERE work_order_task_item = ? AND material_used = ?", (ti_id, mat_id))
        link = cursor.fetchone()
        
        if link:
            cursor.execute("UPDATE task_material_linkage SET quantity_used = ? WHERE id = ?", (required, link['id']))
        else:
            cursor.execute("INSERT INTO task_material_linkage (material_used, work_order_task_item, quantity_used) VALUES (?, ?, ?)", (mat_id, ti_id, required))
            
        print(f"  Ensured shortage for {wo_id} (Material {mat_id}, Required {required}, Available {available})")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    import random
    ensure_pr_wos()
