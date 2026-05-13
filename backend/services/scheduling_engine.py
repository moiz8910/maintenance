import sqlite3
from datetime import datetime, timedelta
import random
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "maintenance.db")
MAX_PER_DAY = 4

def reschedule_work_order(wo_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 1. Calculate Max Lead Time
    cursor.execute("""
        SELECT MAX(m.lead_time) as max_lead
        FROM task_material_linkage m
        JOIN work_order_task_item t ON m.work_order_task_item = t.id
        JOIN material_master mm ON m.material_used = mm.id
        LEFT JOIN (
            SELECT material, SUM(stock_available_on_hand) as stock
            FROM on_hand_inventory
            GROUP BY material
        ) inv ON inv.material = mm.id
        WHERE t.work_order = ? AND m.quantity_used > COALESCE(inv.stock, 0)
    """, (wo_id,))
    
    row = cursor.fetchone()
    lead_time = row['max_lead'] if row and row['max_lead'] is not None else 0
    
    # 2. Determine Start Date
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    earliest_start = today + timedelta(days=lead_time)
    
    # 3. Find first available slot (MAX_PER_DAY)
    current_date = earliest_start
    while True:
        date_str = current_date.strftime("%d-%m-%y")
        cursor.execute("SELECT COUNT(*) FROM work_order_task_item WHERE work_order_task_item_open_day = ?", (date_str,))
        count = cursor.fetchone()[0]
        
        # If this WO already has tasks on this day, we don't count them against the limit for itself
        cursor.execute("SELECT COUNT(*) FROM work_order_task_item WHERE work_order_task_item_open_day = ? AND work_order = ?", (date_str, wo_id))
        self_count = cursor.fetchone()[0]
        
        if (count - self_count) < MAX_PER_DAY:
            break
        current_date += timedelta(days=1)

    target_date_str = current_date.strftime("%d-%m-%y")
    
    # 4. Update Task Items
    cursor.execute("""
        UPDATE work_order_task_item
        SET work_order_task_item_open_day = ?,
            work_order_task_item_finish_day = ?
        WHERE work_order = ?
    """, (target_date_str, target_date_str, wo_id))
    
    conn.commit()
    conn.close()
    return target_date_str
