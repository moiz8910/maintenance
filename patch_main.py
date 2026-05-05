"""Patch main.py to import and include the lookup router."""
import re

path = r"C:\Users\India\Documents\Maintenance\Platform\maintenance\backend\main.py"

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1) Add import after agent_manager import
old_import = "from services.agent_manager import run_maintenance_assistant, run_agent_workflow"
new_import = old_import + "\nfrom lookup_router import router as lookup_router"
if "lookup_router" not in content:
    content = content.replace(old_import, new_import)
    print("Added import")
else:
    print("Import already present")

# 2) Add app.include_router after app = FastAPI(...)
old_app = 'app = FastAPI(title="AI-Powered Maintenance Intelligence Platform")'
new_app = old_app + "\napp.include_router(lookup_router)"
if "include_router(lookup_router)" not in content:
    content = content.replace(old_app, new_app)
    print("Added include_router")
else:
    print("include_router already present")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done! main.py patched successfully.")
