"""Create billing_logs table for token-based dummy payments."""
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
conn.autocommit = True
cur = conn.cursor()
cur.execute("""
CREATE TABLE IF NOT EXISTS billing_logs (
    id          uuid primary key default uuid_generate_v4(),
    user_id     uuid not null references profiles(id) on delete cascade,
    plan        text not null,
    prev_plan   text not null default 'free',
    token       text not null,
    amount      text not null default '$0.00',
    status      text not null default 'success',
    note        text,
    created_at  timestamptz default now()
);

-- RLS: users can only read their own logs
ALTER TABLE billing_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own billing logs" ON billing_logs;
CREATE POLICY "users can read own billing logs"
    ON billing_logs FOR SELECT
    USING (auth.uid() = user_id);
""")
print("✓ billing_logs table created with RLS")
cur.close()
conn.close()
