"""Add help_text, error_message, settings columns to questions."""
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
conn.autocommit = True
cur = conn.cursor()
for stmt in [
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS help_text text",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS error_message text",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS placeholder text",
]:
    cur.execute(stmt)
    print(f"✓ {stmt[:70]}")
cur.close()
conn.close()
