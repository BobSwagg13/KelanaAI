"""
Replaces `trips.image_url` with `trips.image_data`.

`add_trip_image.py` originally stored a URL, on the assumption the photo would
live in an S3 bucket. Standing that bucket up needs a bucket, a public-read
policy and an IAM grant, which is a lot of infrastructure for a decorative
image — so the JPEG is stored in Postgres instead (~70 KB each) and served by
GET /api/v1/trips/{id}/image.

No data is lost that matters: `image_url` was never populated in any
environment, since the S3 upload it depended on was never configured.

Run once from `backend/`, AFTER add_trip_image.py:

    python migrations/swap_trip_image_url_for_data.py
    python migrations/swap_trip_image_url_for_data.py --downgrade

Safe to re-run: every statement is IF NOT EXISTS / IF EXISTS.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine


def upgrade() -> None:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE trips ADD COLUMN IF NOT EXISTS image_data BYTEA"))
        print("Added column: trips.image_data")
        conn.execute(text("ALTER TABLE trips DROP COLUMN IF EXISTS image_url"))
        print("Dropped column: trips.image_url")


def downgrade() -> None:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE trips ADD COLUMN IF NOT EXISTS image_url VARCHAR"))
        print("Restored column: trips.image_url")
        conn.execute(text("ALTER TABLE trips DROP COLUMN IF EXISTS image_data"))
        print("Dropped column: trips.image_data")


if __name__ == "__main__":
    if "--downgrade" in sys.argv:
        downgrade()
    else:
        upgrade()
    print("Migration complete.")
