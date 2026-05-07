from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=api_key)

try:
    print("Listing models...")
    for model in client.models.list():
        print(f"- {model.name} (supports: {model.supported_generation_methods})")
except Exception as e:
    print(f"Error listing models: {e}")
