import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
g_key = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=g_key)

print("Listing models:")
for m in client.models.list():
    print(f"Name: {m.name}, Supported Actions: {m.supported_actions}")
