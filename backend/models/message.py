from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # 'user' or 'assistant'. Sized generously so a future 'system'/'tool' role
    # does not need a migration.
    role = Column(String(16), nullable=False)
    content = Column(Text, nullable=False)
    # Serialized JSON list of the KB passages an assistant answer was grounded
    # in ({document, snippet, score}); null for user messages. Parsed back on
    # read so the UI can show grounding after a reload.
    sources = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    conversation = relationship("Conversation", back_populates="messages")
