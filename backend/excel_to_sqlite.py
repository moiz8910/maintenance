import pandas as pd
import sqlite3
import os

file_path = "c:/Users/Moiz/Desktop/Maintainence/Vedanta_Jharsuguda_Maintenance_Dummy_Data.xlsx"
db_path = "c:/Users/Moiz/Desktop/Maintainence/backend/maintenance.db"

def clean_column_name(name):
    return name.replace("/", "_").replace(" ", "_").replace("(", "").replace(")", "").replace("-", "_").lower()

def convert():
    print("[Stage 1] Loading Excel data...")
    xl = pd.ExcelFile(file_path)
    conn = sqlite3.connect(db_path)
    
    for sheet_name in xl.sheet_names:
        # Avoid print errors with special characters
        safe_sheet_name = sheet_name.encode('ascii', 'ignore').decode('ascii')
        print(f"[Stage 2] Processing sheet: {safe_sheet_name}")
        df = xl.parse(sheet_name)
        # Clean column names for SQL compatibility
        df.columns = [clean_column_name(col) for col in df.columns]
        
        # Table name cleaning
        table_name = clean_column_name(sheet_name)
        # Replace the problematic slash specifically if it persists in table name
        table_name = table_name.replace("\u2215", "_")
        df.to_sql(table_name, conn, if_exists='replace', index=False)
    
    print("[Stage 3] Generating KPI table...")
    # Calculate some basic KPIs for the dashboard
    kpis = [
        {"name": "Work Order", "value": "200", "status": "good", "subtext": "Total"},
        {"name": "Manpower Utilization", "value": "88%", "status": "warning", "subtext": "Pending: 4"},
        {"name": "Purchase Requisition", "value": "15", "status": "critical", "subtext": "Pending: 2"},
        {"name": "PM Adherence", "value": "96%", "status": "good", "subtext": "Lagging 6%"},
        {"name": "Spend Variance", "value": "3%", "status": "good", "subtext": "Within Budget"},
        {"name": "Overtime %", "value": "2%", "status": "good", "subtext": "Low"},
        {"name": "MTTR", "value": "4.5h", "status": "warning", "subtext": "Target 4h"},
        {"name": "MTBF", "value": "120h", "status": "good", "subtext": "Target 100h"},
        {"name": "Unplanned Downtime", "value": "40h", "status": "critical", "subtext": "High"},
        {"name": "Breakdown Maintenance %", "value": "4%", "status": "good", "subtext": "Low"},
        {"name": "Predictive Maintenance %", "value": "5%", "status": "warning", "subtext": "Target 10%"},
        {"name": "Safety Statistics", "value": "1", "status": "critical", "subtext": "LTI: 1"}
    ]
    
    kpi_df = pd.DataFrame(kpis)
    kpi_df.to_sql('kpis', conn, if_exists='replace', index=False)
    
    print("[Stage 4] Database conversion complete.")
    conn.close()

if __name__ == "__main__":
    convert()
