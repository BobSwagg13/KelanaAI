"""
Adds the destination-photo columns to `trips`.

`database.init_db()` runs `Base.metadata.create_all`, which only creates missing
*tables* — it never alters an existing one, so a new column needs a script.

Run once from `backend/`:

    python migrations/add_trip_image.py
    python migrations/add_trip_image.py --downgrade

Safe to re-run: every statement is IF NOT EXISTS / IF EXISTS.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine

COLUMNS = [
    ("image_url", "VARCHAR"),
    ("image_credit_name", "VARCHAR"),
    ("image_credit_url", "VARCHAR"),
]


def upgrade() -> None:
    with engine.begin() as conn:
        for name, coltype in COLUMNS:
            conn.execute(
                text(f"ALTER TABLE trips ADD COLUMN IF NOT EXISTS {name} {coltype}")
            )
            print(f"Added column: trips.{name}")


def downgrade() -> None:
    with engine.begin() as conn:
        for name, _ in COLUMNS:
            conn.execute(text(f"ALTER TABLE trips DROP COLUMN IF EXISTS {name}"))
            print(f"Dropped column: trips.{name}")


if __name__ == "__main__":
    if "--downgrade" in sys.argv:
        downgrade()
    else:
        upgrade()
    print("Migration complete.")
