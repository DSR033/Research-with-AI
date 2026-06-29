"""Create notifications table."""
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
conn.autocommit = True
cur = conn.cursor()
cur.execute("""
CREATE TABLE IF NOT EXISTS notifications (
    id          uuid primary key default uuid_generate_v4(),
    user_id     uuid not null references profiles(id) on delete cascade,
    type        text not null,
    title       text not null,
    message     text,
    survey_id   uuid references surveys(id) on delete set null,
    link        text,
    read        boolean not null default false,
    created_at  timestamptz default now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(user_id, read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read own notifications" ON notifications;
CREATE POLICY "users can read own notifications"
    ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can update own notifications" ON notifications;
CREATE POLICY "users can update own notifications"
    ON notifications FOR UPDATE USING (auth.uid() = user_id);
""")
print("✓ notifications table created")
cur.close()
conn.close()
