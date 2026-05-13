import sqlite3
import random
from datetime import datetime, timedelta

# ── Configuration ─────────────────────────────────────────────────────────────
DB_PATH      = "backend/maintenance.db"
MAX_PER_DAY  = 4          # Maximum work orders scheduled on any single day
TODAY        = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
SCHEDULE_FROM = TODAY     # Task items scheduled from today onwards
# WO open date = today-2 or today-3 (WO was raised before scheduling)
WO_OPEN_OFFSETS = [-2, -3]  # days before today
# ─────────────────────────────────────────────────────────────────────────────

def schedule_wos():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # ── 1. Fetch pending WOs joined with asset criticality ────────────────────
    cursor.execute("""
        SELECT DISTINCT w.id AS wo_id,
               w.repair_type,
               w.work_order_class,
               COALESCE(a.criticality, 9) AS criticality
        FROM work_order w
        LEFT JOIN work_order_task_item woti_existing ON woti_existing.work_order = w.id
        LEFT JOIN asset a ON woti_existing.asset = a.id
        WHERE LOWER(w.work_order_status) = 'pending'
        ORDER BY COALESCE(a.criticality, 9) ASC, w.id ASC
    """)
    rows = cursor.fetchall()

    # De-duplicate WOs (a WO may appear multiple times if it has multiple assets)
    seen_wos = set()
    ordered_wos = []
    for row in rows:
        if row['wo_id'] not in seen_wos:
            seen_wos.add(row['wo_id'])
            ordered_wos.append(dict(row))

    print(f"Found {len(ordered_wos)} pending work orders — sorted by asset criticality.")
    if not ordered_wos:
        conn.close()
        return

    # ── 2. Lookup pools ───────────────────────────────────────────────────────
    cursor.execute("SELECT id FROM task")
    available_tasks = [r[0] for r in cursor.fetchall()]

    cursor.execute("SELECT id FROM technician_engineer")
    available_techs = [r[0] for r in cursor.fetchall()]

    cursor.execute("SELECT id, criticality FROM asset")
    available_assets = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT id, material as material_id, price_per_unit FROM material_price")
    available_materials = [dict(r) for r in cursor.fetchall()]

    # ── 3. Build day-bucket schedule ──────────────────────────────────────────
    # Task items are scheduled from TODAY onwards, max MAX_PER_DAY/day
    # WO open_day is set to today-2 or today-3 (raised before scheduling)
    # Track daily assignments to respect MAX_PER_DAY
    daily_assignments = {} # date_obj -> count

    # Track globally unique task item IDs across the run
    used_task_item_ids = set()

    for idx, wo in enumerate(ordered_wos):
        wo_id      = wo['wo_id']
        criticality = wo.get('criticality', 9)
        repair_type = (wo.get('repair_type') or '').lower()
        wo_class    = (wo.get('work_order_class') or '').upper()

        # ── 3.5 Calculate Schedule Date based on Open Day + Lead Time ────────
        # Get existing open day if available, else generate one
        cursor.execute("SELECT work_order_open_day FROM work_order WHERE id = ?", (wo_id,))
        existing_open = cursor.fetchone()[0]
        if existing_open:
            try:
                d, m, y = existing_open.split('-')
                wo_open_day = datetime(2000 + int(y), int(m), int(d))
            except:
                wo_open_day = TODAY + timedelta(days=random.choice(WO_OPEN_OFFSETS))
        else:
            wo_open_day = TODAY + timedelta(days=random.choice(WO_OPEN_OFFSETS))
        
        # Get Max Lead Time
        cursor.execute("""
            SELECT MAX(m.lead_time) 
            FROM task_material_linkage m 
            JOIN work_order_task_item t ON m.work_order_task_item = t.id 
            WHERE t.work_order = ?
        """, (wo_id,))
        max_lead = cursor.fetchone()[0] or 0
        
        # Logic: Schedule Date = Open Day + Lead Time
        # fallback to TODAY if the calculated date is in the past
        target_date = wo_open_day + timedelta(days=max_lead)
        if target_date < TODAY:
            target_date = TODAY
            
        # Capacity check: Find next available slot on or after target_date
        candidate_day = target_date
        while daily_assignments.get(candidate_day, 0) >= MAX_PER_DAY:
            candidate_day += timedelta(days=1)
        
        daily_assignments[candidate_day] = daily_assignments.get(candidate_day, 0) + 1
        task_date_str = candidate_day.strftime("%d-%m-%y")
        wo_open_date_str = wo_open_day.strftime("%d-%m-%y")

        # Log logic application
        if max_lead > 0:
            print(f"  [Rule Applied] {wo_id}: Opened {wo_open_date_str} + {max_lead}d Lead = Target {target_date.strftime('%d-%m-%y')}. Scheduled: {task_date_str}")

        # ── 4. Clear old task items for this WO ──────────────────────────────
        old_task_items = [r[0] for r in cursor.execute(
            "SELECT id FROM work_order_task_item WHERE work_order = ?", (wo_id,)
        ).fetchall()]
        if old_task_items:
            placeholders = ','.join('?' * len(old_task_items))
            cursor.execute(f"DELETE FROM technician_engineer_linkage WHERE work_order_task_item IN ({placeholders})", old_task_items)
        cursor.execute("DELETE FROM work_order_task_item WHERE work_order = ?", (wo_id,))
        # ── 5. Determine number of tasks ──────────────────────────────────────
        # Breakdown Class A = 1 task, B = 1-2, everything else = 1-3
        if "breakdown" in repair_type and wo_class == 'A':
            num_tasks = 1
        elif "breakdown" in repair_type and wo_class in ('B', 'C'):
            num_tasks = random.choice([1, 2])
        else:
            num_tasks = random.choice([1, 2, 2, 3])

        # ── 6. Create task items ──────────────────────────────────────────────
        earliest_start_hour = 24
        earliest_start_min  = 60

        # Choose assets matching criticality level where possible
        preferred_assets = [a for a in available_assets if str(a.get('criticality', '')) == str(criticality)]
        asset_pool = preferred_assets if preferred_assets else available_assets

        for i in range(num_tasks):
            task_id = random.choice(available_tasks)

            # Match technician to task discipline
            cursor.execute("SELECT discipline FROM task WHERE id = ?", (task_id,))
            task_disc_row = cursor.fetchone()
            task_disc = task_disc_row[0] if task_disc_row else ''
            cursor.execute(
                "SELECT id FROM technician_engineer WHERE LOWER(discipline_trade) = LOWER(?)", (task_disc,)
            )
            matching_techs = [r[0] for r in cursor.fetchall()]
            tech_id = random.choice(matching_techs) if matching_techs else random.choice(available_techs)

            # Start time: criticality 1 gets early morning slots
            if criticality == 1:
                start_hour = random.randint(6, 10)
            elif criticality == 2:
                start_hour = random.randint(9, 13)
            else:
                start_hour = random.randint(12, 16)

            start_min = random.choice([0, 15, 30, 45])
            duration  = random.randint(2, 6)
            end_hour  = min(start_hour + duration, 23)

            start_time = f"{start_hour:02d}:{start_min:02d}"
            end_time   = f"{end_hour:02d}:{start_min:02d}"

            if start_hour < earliest_start_hour or (start_hour == earliest_start_hour and start_min < earliest_start_min):
                earliest_start_hour = start_hour
                earliest_start_min  = start_min

            # ── Globally unique task item ID ──────────────────────────────────
            base_id = f"WOT-{wo_id[-4:]}-{i+1}"
            unique_id = base_id
            suffix = 0
            while unique_id in used_task_item_ids:
                suffix += 1
                unique_id = f"{base_id}-{suffix}"
            used_task_item_ids.add(unique_id)

            asset_id = random.choice(asset_pool)['id']

            cursor.execute("""
                INSERT INTO work_order_task_item
                    (id, work_order, asset, task,
                     work_order_task_item_open_day, work_order_task_item_open_time,
                     work_order_task_item_finish_day, work_order_task_item_finish_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (unique_id, wo_id, asset_id, task_id,
                  task_date_str, start_time, task_date_str, end_time))

            cursor.execute("""
                INSERT INTO technician_engineer_linkage
                    (work_order_task_item, technician_engineer_engaged, technician_service_period)
                VALUES (?, ?, ?)
            """, (unique_id, tech_id, duration))

            # ── 50% chance to assign materials ────────────────────────────────
            # Force at least 2 WOs to have shortages
            force_shortage = (idx < 2) 
            
            if (random.random() < 0.5 or force_shortage) and available_materials:
                num_mats = random.randint(1, 3)
                chosen_mats = random.sample(available_materials, min(num_mats, len(available_materials)))
                for mat in chosen_mats:
                    # If forcing shortage, set quantity_used > available
                    qty = random.randint(1, 5)
                    lead_time = None
                    
                    if force_shortage:
                        cursor.execute("SELECT SUM(stock_available_on_hand) FROM on_hand_inventory WHERE material = ?", (mat['material_id'],))
                        avail = cursor.fetchone()[0] or 0
                        qty = avail + random.randint(5, 15)
                        lead_time = random.randint(5, 14) # Ensure a lead time exists for PR
                    
                    cursor.execute("""
                        INSERT INTO task_material_linkage 
                            (work_order_task_item, material_used, quantity_used, material_price, lead_time)
                        VALUES (?, ?, ?, ?, ?)
                    """, (unique_id, mat['material_id'], qty, mat['id'], lead_time))

        # ── 7. Update WO open day/time (raised 2-3 days before scheduling) ──
        wo_open_min  = earliest_start_min - 30
        wo_open_hour = earliest_start_hour
        if wo_open_min < 0:
            wo_open_min  += 60
            wo_open_hour -= 1

        wo_open_time = f"{max(0, wo_open_hour):02d}:{wo_open_min:02d}"
        cursor.execute(
            "UPDATE work_order SET work_order_open_day = ?, work_order_open_time = ? WHERE id = ?",
            (wo_open_date_str, wo_open_time, wo_id)
        )

        print(f"  Opened {wo_open_date_str} | Scheduled {task_date_str} | {wo_id} | Criticality {criticality} | {num_tasks} task(s)")

    conn.commit()
    conn.close()

    total_days = (max(daily_assignments.keys()) - TODAY).days + 1 if daily_assignments else 0
    print(f"\nScheduling complete: {len(ordered_wos)} WOs across {total_days} day(s)")
    print(f"  WO open dates: {(TODAY + timedelta(days=-3)).strftime('%d-%m-%y')} to {(TODAY + timedelta(days=-2)).strftime('%d-%m-%y')} (today-3 to today-2)")
    print(f"  Tasks scheduled: {TODAY.strftime('%d-%m-%y')} onwards")

if __name__ == "__main__":
    schedule_wos()
