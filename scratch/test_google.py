import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=api_key)

try:
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=["Say hello"]
    )
    print(f"Gemini success: {response.text}")
except Exception as e:
    print(f"Gemini failure: {e}")
