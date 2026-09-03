from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    # Unique + indexed: login looks users up by email on every sign-in.
    email = Column(String(255), nullable=False, unique=True, index=True)
    # Never stores the plain password — only a bcrypt hash (60 chars today, but
    # sized generously so a future algorithm change doesn't need a migration).
    password_hash = Column(String(255), nullable=False)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Deleting a user removes their trips; a trip cannot outlive its owner.
    trips = relationship("Trip", back_populates="user", cascade="all, delete-orphan")
    # Same rule for chat history.
    conversations = relationship(
        "Conversation", back_populates="user", cascade="all, delete-orphan"
    )
