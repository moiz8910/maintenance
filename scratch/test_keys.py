import os
from dotenv import load_dotenv
import openai
from google import genai

load_dotenv()

g_key = os.getenv("GOOGLE_API_KEY")
o_key = os.getenv("OPENAI_API_KEY")
provider = os.getenv("MODEL_PROVIDER", "google").lower()

print(f"MODEL_PROVIDER: {provider}")

if g_key:
    print(f"GOOGLE_API_KEY: Found ({g_key[:8]}...)")
    try:
        client = genai.Client(api_key=g_key)
        client.models.generate_content(model="gemini-flash-latest", contents=["Hi"])
        print("GOOGLE_API_KEY: Working")
    except Exception as e:
        print(f"GOOGLE_API_KEY: Error - {e}")
else:
    print("GOOGLE_API_KEY: Not Found")

if o_key:
    print(f"OPENAI_API_KEY: Found ({o_key[:8]}...)")
    try:
        client = openai.OpenAI(api_key=o_key)
        client.chat.completions.create(model="gpt-4o", messages=[{"role": "user", "content": "Hi"}], max_tokens=5)
        print("OPENAI_API_KEY: Working")
    except Exception as e:
        print(f"OPENAI_API_KEY: Error - {e}")
else:
    print("OPENAI_API_KEY: Not Found")
