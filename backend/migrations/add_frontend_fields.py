"""
Adds the frontend-required columns to the existing `trips` table.

`database.init_db()` only creates tables that don't exist yet, so it can't
add columns to a `trips` table created before these fields existed. Run
this once (from the `backend/` directory) after pulling in the new fields:

    python migrations/add_frontend_fields.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine

COLUMNS = [
    ("country", "VARCHAR"),
    ("latitude", "FLOAT"),
    ("longitude", "FLOAT"),
    ("currency", "VARCHAR DEFAULT 'USD'"),
    ("travel_month", "VARCHAR"),
    ("travel_style", "VARCHAR"),
    ("hotel_cost", "FLOAT"),
    ("food_cost", "FLOAT"),
    ("transport_cost", "FLOAT"),
    ("miscellaneous_cost", "FLOAT"),
]


def upgrade() -> None:
    with engine.begin() as conn:
        for column, column_type in COLUMNS:
            conn.execute(
                text(f"ALTER TABLE trips ADD COLUMN IF NOT EXISTS {column} {column_type}")
            )
            print(f"Ensured column: {column}")


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
