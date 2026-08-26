from sqlalchemy import Column, Integer, String, Float, Text
from database import Base

class Trip(Base):
    __tablename__ = "trips"

    id           = Column(Integer, primary_key=True)
    destination  = Column(String,   nullable=False)
    country      = Column(String,   nullable=False)
    latitude     = Column(Float,    nullable=False)
    longitude    = Column(Float,    nullable=False)
    days         = Column(Integer,  nullable=False)
    budget       = Column(Float,    nullable=False)
    currency     = Column(String,   nullable=False, default='USD')
    travel_month = Column(String,   nullable=False)
    travel_style = Column(String,   nullable=False)
    category     = Column(String,   nullable=False)
    daily_budget = Column(Float,    nullable=False)

    hotel_cost         = Column(Float, nullable=True)
    food_cost          = Column(Float, nullable=True)
    transport_cost     = Column(Float, nullable=True)
    miscellaneous_cost = Column(Float, nullable=True)

    ai_recommendation = Column(Text, nullable=True)
