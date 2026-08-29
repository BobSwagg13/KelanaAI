"""
Adds the `users` table and makes every trip owned by a user.

DESTRUCTIVE: this DELETES ALL EXISTING TRIPS.

That is deliberate and was chosen explicitly. Existing rows have no owner, and
`user_id` is meant to be NOT NULL — there is no correct owner to invent for
them. Wiping first means the column can be NOT NULL from the start rather than
nullable-forever with defensive checks scattered through the code.

A snapshot of the pre-migration rows is kept at
`backend/trips_backup_before_auth.json` if anything needs recovering.

Run once from `backend/`:

    python migrations/add_users_and_trip_ownership.py

The script refuses to run twice: if `trips.user_id` already exists it exits
without touching data, so an accidental re-run cannot wipe live trips.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine


def _column_exists(conn, table: str, column: str) -> bool:
    return conn.execute(
        text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c"
        ),
        {"t": table, "c": column},
    ).first() is not None


def upgrade() -> None:
    with engine.begin() as conn:
        # Guard: never wipe trips on a second run.
        if _column_exists(conn, "trips", "user_id"):
            print("trips.user_id already exists — migration already applied. No changes made.")
            return

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id            SERIAL PRIMARY KEY,
                    name          VARCHAR(100) NOT NULL,
                    email         VARCHAR(255) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        print("Created table: users")

        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email)"))
        print("Ensured index: ix_users_email")

        deleted = conn.execute(text("DELETE FROM trips")).rowcount
        print(f"Deleted {deleted} ownerless trip(s) (snapshot: trips_backup_before_auth.json)")

        # Safe as NOT NULL because the table is now empty.
        conn.execute(text("ALTER TABLE trips ADD COLUMN user_id INTEGER NOT NULL"))
        conn.execute(
            text(
                "ALTER TABLE trips ADD CONSTRAINT fk_trips_user_id "
                "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_trips_user_id ON trips (user_id)"))
        print("Added trips.user_id (NOT NULL, FK -> users.id ON DELETE CASCADE, indexed)")


def downgrade() -> None:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE trips DROP CONSTRAINT IF EXISTS fk_trips_user_id"))
        conn.execute(text("DROP INDEX IF EXISTS ix_trips_user_id"))
        conn.execute(text("ALTER TABLE trips DROP COLUMN IF EXISTS user_id"))
        print("Dropped trips.user_id and its constraint/index")

        conn.execute(text("DROP TABLE IF EXISTS users CASCADE"))
        print("Dropped table: users")


if __name__ == "__main__":
    if "--downgrade" in sys.argv:
        downgrade()
    else:
        upgrade()
    print("Migration complete.")
