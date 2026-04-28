import pandas as pd
import json

file_path = "c:/Users/Moiz/Desktop/Maintainence/Vedanta_Jharsuguda_Maintenance_Dummy_Data.xlsx"

try:
    xl = pd.ExcelFile(file_path)
    sheets_info = {}
    for sheet_name in xl.sheet_names:
        df = xl.parse(sheet_name)
        sheets_info[sheet_name] = {
            "columns": list(df.columns),
            "rows": len(df)
        }
    
    print(json.dumps(sheets_info, indent=2))
except Exception as e:
    print(f"Error: {e}")
