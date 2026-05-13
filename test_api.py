import requests
import json

try:
    res = requests.get('http://localhost:8000/api/diagnostic/work-orders')
    print(f"Status: {res.status_code}")
    data = res.json()
    print(f"Count: {len(data)}")
    if len(data) > 0:
        print(f"First Item: {data[0]}")
except Exception as e:
    print(f"Error: {e}")
