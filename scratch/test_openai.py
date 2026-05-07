import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=api_key)

try:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Test connection"}],
        max_tokens=5
    )
    print("SUCCESS: OpenAI connection is working and has credits.")
    print("Response:", response.choices[0].message.content)
except Exception as e:
    print(f"FAILURE: OpenAI call failed. Error: {e}")
