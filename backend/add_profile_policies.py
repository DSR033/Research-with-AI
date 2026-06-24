"""Add RLS policies for profiles table and auto-create profile on auth."""
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

statements = [
    # Drop existing policies to avoid conflicts
    'DROP POLICY IF EXISTS "users can read own profile" ON profiles',
    'DROP POLICY IF EXISTS "users can insert own profile" ON profiles',
    'DROP POLICY IF EXISTS "users can update own profile" ON profiles',
    # Create policies
    'CREATE POLICY "users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id)',
    'CREATE POLICY "users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id)',
    'CREATE POLICY "users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id)',
    # Trigger function
    """
    CREATE OR REPLACE FUNCTION handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (id, full_name, role)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'owner'
      )
      ON CONFLICT (id) DO NOTHING;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
    """,
    "DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users",
    """
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user()
    """,
]

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
conn.autocommit = True
cur = conn.cursor()
for stmt in statements:
    cur.execute(stmt)
    print(f"✓ {stmt.strip()[:60]}")
cur.close()
conn.close()
print("\nDone.")
