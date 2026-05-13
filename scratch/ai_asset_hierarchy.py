import os
import json
import sqlite3
import openai
from dotenv import load_dotenv

load_dotenv()

# Initialize OpenAI
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
DB_PATH = "backend/maintenance.db"

def get_assets():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    # Fetch ID, Name, Type, and Location to provide context
    cursor.execute("SELECT a.id, a.name, at.type as asset_type, a.location FROM asset a LEFT JOIN asset_type at ON a.type = at.id")
    assets = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return assets

def suggest_hierarchy(assets):
    # Prepare asset list for prompt
    asset_list_str = "\n".join([f"- {a['id']}: {a['name']} ({a['asset_type']}) at {a['location']}" for a in assets])
    
    prompt = f"""
    Act as a Senior Industrial Maintenance Architect for an Aluminum Smelter.
    I have a list of assets that currently have random or missing parent-child relationships.
    
    Your task is to analyze the names and types of these assets and assign a logical hierarchy.
    
    Guidelines:
    1. A "Child" asset should be a component or sub-assembly of a "Parent" asset.
    2. Example: An "Induction Motor" or "Gearbox" should likely be a child of a "Belt Conveyor", "Centrifugal Pump", or "Cooling Fan".
    3. Example: A "Belt Conveyor" could be a child of a "Material Handling System".
    4. Assets like "Potline 1", "Bake Oven", or "Casting Machine" are likely top-level (Root) assets.
    5. If an asset is a top-level system, its parent should be NULL.
    6. Ensure relationships make engineering sense for an Aluminum Smelter.
    
    Asset List:
    {asset_list_str}
    
    Return your response EXACTLY as a JSON object where the key is the child asset ID and the value is the parent asset ID (or null for root assets).
    Example: {{ "AST-0005": "AST-0001", "AST-0002": null }}
    """
    
    print(f"Sending {len(assets)} assets to OpenAI for hierarchical analysis...")
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are an expert in industrial asset hierarchy. Return ONLY raw JSON."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    
    return json.loads(response.choices[0].message.content)

def update_db(hierarchy):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("Updating database with AI-suggested hierarchy...")
    updates = 0
    for child_id, parent_id in hierarchy.items():
        # Verify parent exists if not null
        if parent_id:
            cursor.execute("SELECT id FROM asset WHERE id = ?", (parent_id,))
            if not cursor.fetchone():
                print(f"Warning: Suggested parent {parent_id} does not exist. Skipping.")
                continue
        
        cursor.execute("UPDATE asset SET parent_asset = ? WHERE id = ?", (parent_id, child_id))
        updates += cursor.rowcount
    
    conn.commit()
    conn.close()
    print(f"Successfully updated {updates} assets.")

if __name__ == "__main__":
    assets = get_assets()
    if not assets:
        print("No assets found in database.")
    else:
        try:
            hierarchy = suggest_hierarchy(assets)
            update_db(hierarchy)
        except Exception as e:
            print(f"Error during AI processing: {e}")
