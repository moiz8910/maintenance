from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=api_key)

try:
    print("Listing models...")
    models = list(client.models.list())
    for model in models:
        print(model)
except Exception as e:
    print(f"Error listing models: {e}")
