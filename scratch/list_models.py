from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=api_key)

try:
    # Attempt to list models or just try a different name
    print("Testing gemini-1.5-flash-latest...")
    response = client.models.generate_content(model="gemini-1.5-flash-latest", contents=["Hello"])
    print("Success with gemini-1.5-flash-latest!")
except Exception as e:
    print(f"Error with gemini-1.5-flash-latest: {e}")

try:
    print("\nTesting gemini-1.5-flash...")
    response = client.models.generate_content(model="gemini-1.5-flash", contents=["Hello"])
    print("Success with gemini-1.5-flash!")
except Exception as e:
    print(f"Error with gemini-1.5-flash: {e}")
