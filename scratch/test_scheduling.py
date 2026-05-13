import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from services.scheduling_engine import reschedule_work_order

wo_id = 'WO-0023'
new_date = reschedule_work_order(wo_id)
print(f"Rescheduled {wo_id} to {new_date}")
