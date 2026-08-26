"""
Adds `country_code` and `created_at` to the existing `trips` table.

`database.init_db()` only creates tables that don't exist yet, so it can't add
columns to a `trips` table created earlier. Run this once from `backend/`:

    python migrations/add_country_code_and_created_at.py

`created_at` is deliberately added WITHOUT backfilling existing rows: a
`DEFAULT now()` backfill would stamp every pre-existing trip with the migration
timestamp, so a month-old trip would render as "created just now". The default
is attached afterwards so only NEW rows get a timestamp; older rows stay NULL
and the UI simply omits the date for them.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine

COLUMNS = [
    ("country_code", "VARCHAR"),
    ("created_at", "TIMESTAMPTZ"),
]


def upgrade() -> None:
    with engine.begin() as conn:
        for column, column_type in COLUMNS:
            conn.execute(
                text(f"ALTER TABLE trips ADD COLUMN IF NOT EXISTS {column} {column_type}")
            )
            print(f"Ensured column: {column}")

        # Attached after the ADD COLUMN so existing rows keep NULL.
        conn.execute(
            text("ALTER TABLE trips ALTER COLUMN created_at SET DEFAULT now()")
        )
        print("Set default now() on created_at (new rows only)")


def downgrade() -> None:
    with engine.begin() as conn:
        for column, _ in reversed(COLUMNS):
            conn.execute(text(f"ALTER TABLE trips DROP COLUMN IF EXISTS {column}"))
            print(f"Dropped column: {column}")


if __name__ == "__main__":
    if "--downgrade" in sys.argv:
        downgrade()
    else:
        upgrade()
    print("Migration complete.")
