import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError, ProgrammingError, IntegrityError

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

print(f"Applying SQL from {sql_path}...")
with engine.connect() as conn:
    with open(sql_path, "r", encoding="utf-8") as f:
        sql_text = f.read()

    # Naive split by semicolon; for complex scripts consider psql instead
    statements = [s.strip() for s in sql_text.split(';') if s.strip()]

    IGNORABLE_PG_CODES = {
        '42710',  # duplicate_object (e.g., TYPE already exists)
        '42P07',  # duplicate_table
        '42701',  # duplicate_schema
        '42723',  # duplicate_function
        '23505',  # unique_violation (sometimes for seed data; ignore if desired)
    }

    for idx, statement in enumerate(statements, start=1):
        tx = conn.begin()
        try:
            conn.execute(text(statement))
            tx.commit()
        except (ProgrammingError, IntegrityError) as e:
            # Handle duplicates idempotently
            pgcode = getattr(getattr(e, 'orig', None), 'pgcode', None)
            if pgcode in IGNORABLE_PG_CODES:
                tx.rollback()
                print(f"Skipping statement #{idx} due to duplicate (pgcode={pgcode}).")
                continue
            tx.rollback()
            raise
        except SQLAlchemyError:
            tx.rollback()
            raise

print("Database setup complete.")
