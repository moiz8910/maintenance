import requests
import json
import os
from services.agent_manager import GEMINI_MODEL
import services.agent_manager as am

# Temporarily change model
am.GEMINI_MODEL = "gemini-flash-latest"

url = "http://localhost:8000/api/agent/work_instruction_coach"
data = {"message": ""}

try:
    response = requests.post(url, json=data)
    print(f"Testing model: {am.GEMINI_MODEL}")
    print(f"Status Code: {response.status_code}")
    print(f"Response snippet: {response.text[:200]}")
except Exception as e:
    print(f"Error: {e}")
