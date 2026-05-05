from fastapi import APIRouter
from services.drilldown_engine import safe_query

router = APIRouter(prefix="/api/lookup", tags=["lookup"])

@router.get("/tasks")
async def lookup_tasks():
    return safe_query("SELECT id, description FROM task ORDER BY id LIMIT 100")

@router.get("/technicians")
async def lookup_technicians():
    return safe_query("SELECT id, name, role_designation, discipline_trade, standard_hourly_rate FROM technician_engineer ORDER BY name")

@router.get("/materials")
async def lookup_materials():
    return safe_query("""
        SELECT mm.id, mm.description as material,
               COALESCE(SUM(inv.stock_available_on_hand), 0) as available_quantity
        FROM material_master mm
        LEFT JOIN on_hand_inventory inv ON inv.material = mm.id
        GROUP BY mm.id, mm.description
        ORDER BY mm.description
        LIMIT 200
    """)
