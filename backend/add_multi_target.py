"""Add target_questions array column to survey_logic."""
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
conn.autocommit = True
cur = conn.cursor()
cur.execute("ALTER TABLE survey_logic ADD COLUMN IF NOT EXISTS target_questions jsonb DEFAULT '[]'")
print("✓ Added target_questions column")
cur.close()
conn.close()
