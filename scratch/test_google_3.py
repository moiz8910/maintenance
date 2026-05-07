import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=api_key)

with open("scratch/test_results_2.txt", "w") as f:
    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=["Say hello"]
        )
        f.write(f"Gemini success: {response.text}\n")
    except Exception as e:
        f.write(f"Gemini failure: {e}\n")
