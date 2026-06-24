"""Add Stripe billing columns to profiles."""
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

statements = [
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE",
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','starter','pro'))",
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'active' CHECK (plan_status IN ('active','past_due','canceled','trialing'))",
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_period_end timestamptz",
]

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
conn.autocommit = True
cur = conn.cursor()
for stmt in statements:
    cur.execute(stmt)
    print(f"✓ {stmt[:70]}")
cur.close()
conn.close()
print("\nDone.")
