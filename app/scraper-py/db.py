from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()
project_url = os.getenv("PROJECT_URL")
service_role_key = os.getenv("SERVICE_ROLE_KEY")
supabase: Client = create_client(project_url, service_role_key)

def insert_parking_data(rows: list[dict]) -> int:
    if not rows:
        return 0

    response = (
        supabase.table("lot_occupancy")
        .upsert(rows, on_conflict="lot_id,observed_at")
        .execute()
    )
    
    return len(rows)

