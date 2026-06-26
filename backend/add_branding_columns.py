"""Add brand_color and logo_url columns to profiles."""
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
conn.autocommit = True
cur = conn.cursor()
for stmt in [
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS brand_color text DEFAULT '#2E5BFF'",
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url text",
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_name text",
]:
    cur.execute(stmt)
    print(f"✓ {stmt[:60]}")
cur.close()
conn.close()
