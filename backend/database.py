from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# load .env so os.getenv() can read it
load_dotenv()
# connection string from .env — never hardcode secrets
DATABASE_URL = os.getenv("DATABASE_URL")

# engine = the connection pool.
# pool_pre_ping / pool_recycle: managed Postgres (Neon, RDS, ...) drops idle
# connections — Neon's free tier also auto-suspends after ~5 min. Without these
# the pool hands out a dead socket and the next query fails with
# "server closed the connection unexpectedly". pre_ping checks liveness before
# handing a connection out; recycle discards any held longer than 5 minutes.
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
# SessionLocal = a factory for DB sessions
SessionLocal = sessionmaker(bind=engine, autoflush=False)

# Base = all ORM models inherit from this
Base = declarative_base()

# create all tables
def init_db() -> None:
  """Create all SQLAlchemy tables for the configured database."""
  Base.metadata.create_all(bind=engine)
