import requests
import json

url = "http://localhost:8000/api/execution-plan/WO-0003"
try:
    print(f"Calling {url}...")
    resp = requests.get(url, timeout=10)
    print(f"Status: {resp.status_code}")
    data = resp.json()
    print("Materials in plan:")
    for m in data.get('materials', []):
        print(f"  - {m['material']} | Req: {m['recommended_quantity']} | Avail: {m['available_quantity']} | LeadTime: {m['lead_time']}")
except Exception as e:
    print(f"Error: {e}")
