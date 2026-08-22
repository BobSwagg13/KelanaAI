from sqlalchemy import Column, Integer, String, Float, Text
from database import Base

class Trip(Base):
    __tablename__ = "trips"
    id           = Column(Integer, primary_key=True)
    destination  = Column(String,   nullable=False)
    days         = Column(Integer,  nullable=False)
    budget       = Column(Float,    nullable=False)
    category     = Column(String,   nullable=False)
    daily_budget = Column(Float,    nullable=False)
    ai_recommendation = Column(Text, nullable=True)
