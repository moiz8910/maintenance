import requests
import json

url = "http://localhost:8000/api/agent/work_instruction_coach"
data = {"message": ""}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
