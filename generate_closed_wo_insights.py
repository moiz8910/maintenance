import sqlite3
import os
import json
from dotenv import load_dotenv
from google import genai

load_dotenv()

# Robust DB Path
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "maintenance.db")
google_api_key = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=google_api_key) if google_api_key else None

def generate_insights_for_closed_wos():
    print("Generating AI Key Insights for Closed Work Orders...")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Fetch closed work orders that don't have insights yet
    cursor.execute("""
        SELECT w.id, w.repair_description, w.repair_type, w.work_order_class, a.name as asset_name, a.id as asset_id
        FROM work_order w
        LEFT JOIN asset a ON w.asset_id = a.id
        WHERE w.work_order_status = 'Closed' AND (w.key_insights IS NULL OR w.key_insights = '')
    """)
    rows = cursor.fetchall()
    
    if not rows:
        print("No closed work orders need insights.")
        return

    for row in rows:
        wo_id = row['id']
        desc = row['repair_description']
        asset = row['asset_name']
        asset_id = row['asset_id']
        
        print(f" -> Processing {wo_id} for {asset}...")
        
        prompt = f"""
        Act as a Reliability Engineer at Vedanta Jharsuguda Aluminum Smelter.
        Provide a technical, context-rich "Key Insight" for the following closed work order.
        The insight should summarize the failure pattern, the technical resolution, and a recommendation for future reliability.
        
        Work Order: {wo_id}
        Asset: {asset} ({asset_id})
        Repair Description: {desc}
        
        Context: Vedanta Jharsuguda operates one of the world's largest aluminum smelters. Consider factors like high magnetic fields, cryolite corrosion, thermal cycling, and alumina handling.
        
        Requirement:
        - 1-2 sharp, technical sentences.
        - Avoid generic advice.
        - Mention specific technical risks or improvements.
        
        Return ONLY the insight text.
        """
        
        try:
            if client:
                response = client.models.generate_content(model="gemini-flash-latest", contents=[prompt])
                insight = response.text.strip()
            else:
                insight = f"Standard technical resolution for {desc} on {asset}. Monitor for recurring vibration patterns."
            
            cursor.execute("UPDATE work_order SET key_insights = ? WHERE id = ?", (insight, wo_id))
            conn.commit()
            print(f"    [OK] Insight saved.")
        except Exception as e:
            print(f"    [Error] {e}")

    conn.close()
    print("Insight generation complete.")

if __name__ == "__main__":
    generate_insights_for_closed_wos()
