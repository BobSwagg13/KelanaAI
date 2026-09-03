"""
Adds the `conversations` and `messages` tables that back the /assistant chat.

`database.init_db()` runs `Base.metadata.create_all`, which *would* create these
two brand-new tables on its own — but the project keeps an explicit script per
schema change (see the other files here), so this mirrors that convention and
also gives a clean `--downgrade`.

Run once from `backend/`:

    python migrations/add_conversations_and_messages.py
    python migrations/add_conversations_and_messages.py --downgrade

Safe to re-run: every statement is `IF NOT EXISTS` / `IF EXISTS`.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine


def upgrade() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS conversations (
                    id         SERIAL PRIMARY KEY,
                    user_id    INTEGER NOT NULL
                               REFERENCES users(id) ON DELETE CASCADE,
                    title      VARCHAR(256),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_conversations_user_id "
                "ON conversations (user_id)"
            )
        )
        print("Created table: conversations")

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS messages (
                    id              SERIAL PRIMARY KEY,
                    conversation_id INTEGER NOT NULL
                                    REFERENCES conversations(id) ON DELETE CASCADE,
                    role            VARCHAR(16) NOT NULL,
                    content         TEXT NOT NULL,
                    sources         TEXT,
                    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_messages_conversation_id "
                "ON messages (conversation_id)"
            )
        )
        print("Created table: messages")


def downgrade() -> None:
    with engine.begin() as conn:
        # messages first: it FKs conversations.
        conn.execute(text("DROP TABLE IF EXISTS messages CASCADE"))
        print("Dropped table: messages")
        conn.execute(text("DROP TABLE IF EXISTS conversations CASCADE"))
        print("Dropped table: conversations")


if __name__ == "__main__":
    if "--downgrade" in sys.argv:
        downgrade()
    else:
        upgrade()
    print("Migration complete.")
