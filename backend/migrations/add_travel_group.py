"""
Adds `travel_group` (who's traveling: solo/couple/family) as an independent
axis from `travel_style` (backpacker/standard/luxury/adventure/cultural).

Before this migration, solo/couple/family lived IN `travel_style`, which made
"family" and "backpacker" mutually exclusive on the same trip even though
that's a perfectly normal combination. Any existing row that used one of those
three values as its travel_style is backfilled: the value moves into the new
`travel_group` column and `travel_style` is cleared, since it no longer
belongs there.

Run once from `backend/`:

    python migrations/add_travel_group.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine

GROUP_VALUES = ("solo", "couple", "family")


def upgrade() -> None:
    with engine.begin() as conn:
        conn.execute(
            text("ALTER TABLE trips ADD COLUMN IF NOT EXISTS travel_group VARCHAR")
        )
        print("Ensured column: travel_group")

        result = conn.execute(
            text(
                "UPDATE trips SET travel_group = travel_style, travel_style = NULL "
                "WHERE travel_style = ANY(:values)"
            ),
            {"values": list(GROUP_VALUES)},
        )
        print(f"Backfilled {result.rowcount} row(s) from travel_style into travel_group")


def downgrade() -> None:
    with engine.begin() as conn:
        # Best-effort: move backfilled values back before dropping the column.
        # A row edited since the migration (fresh travel_style) is left alone.
        result = conn.execute(
            text(
                "UPDATE trips SET travel_style = travel_group "
                "WHERE travel_style IS NULL AND travel_group = ANY(:values)"
            ),
            {"values": list(GROUP_VALUES)},
        )
        print(f"Restored {result.rowcount} row(s) into travel_style")

        conn.execute(text("ALTER TABLE trips DROP COLUMN IF EXISTS travel_group"))
        print("Dropped column: travel_group")


if __name__ == "__main__":
    if "--downgrade" in sys.argv:
        downgrade()
    else:
        upgrade()
    print("Migration complete.")
