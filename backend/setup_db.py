import os
import sys
from sqlalchemy import create_engine, text

SQL_FILE_DEFAULT_PATH = os.environ.get("DB_INIT_SQL", "/app/backend/database_setup.sql")
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set.")
    sys.exit(1)

sql_path = sys.argv[1] if len(sys.argv) > 1 else SQL_FILE_DEFAULT_PATH
if not os.path.exists(sql_path):
    print(f"ERROR: SQL file not found: {sql_path}")
    sys.exit(1)

print(f"Connecting to database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

with engine.begin() as conn:
    print(f"Applying SQL from {sql_path}...")
    with open(sql_path, "r", encoding="utf-8") as f:
        sql_text = f.read()
    # Split on ; only where it ends a statement to be safer could be complex; 
    # simplest approach: run as one chunk. Many psql-specific meta-commands won't work here.
    for statement in filter(None, [s.strip() for s in sql_text.split(';')]):
        if not statement:
            continue
        conn.execute(text(statement))

print("Database setup complete.")
