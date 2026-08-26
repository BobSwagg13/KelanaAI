import json
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from database import SessionLocal, init_db
from models.trip import Trip
from services.trip_service import calculate_daily_budget, get_trip_category
from services.bedrock_service import generate_recommendation, RecommendationError

logging.basicConfig(level=logging.INFO)

# Kept in step with the frontend Zod schema. The upper bound keeps the
# generated itinerary comfortably inside the model's output token budget.
MAX_TRIP_DAYS = 30


class TripRequest(BaseModel):
    destination: str
    country: str
    latitude: float
    longitude: float
    days: int = Field(ge=1, le=MAX_TRIP_DAYS)
    budget: float = Field(gt=0)
    currency: str = "USD"
    travel_month: str
    travel_style: str
    hotel_cost: Optional[float] = None
    food_cost: Optional[float] = None
    transport_cost: Optional[float] = None
    miscellaneous_cost: Optional[float] = None


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://kelanaai.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


def trip_to_dict(trip: Trip) -> dict:
    ai_recommendation = None
    if trip.ai_recommendation:
        try:
            ai_recommendation = json.loads(trip.ai_recommendation)
        except (json.JSONDecodeError, TypeError):
            ai_recommendation = None

    return {
        "id": trip.id,
        "destination": trip.destination,
        "country": trip.country,
        "latitude": trip.latitude,
        "longitude": trip.longitude,
        "days": trip.days,
        "budget": trip.budget,
        "currency": trip.currency,
        "travel_month": trip.travel_month,
        "travel_style": trip.travel_style,
        "category": trip.category,
        "daily_budget": trip.daily_budget,
        "hotel_cost": trip.hotel_cost,
        "food_cost": trip.food_cost,
        "transport_cost": trip.transport_cost,
        "miscellaneous_cost": trip.miscellaneous_cost,
        "ai_recommendation": ai_recommendation,
    }


@app.get("/")
def home():
    return {"message": "Welcome to KelanaAI"}


@app.post("/api/v1/trips")
def create_trip(request: TripRequest):
    daily_budget = calculate_daily_budget(request.budget, request.days)
    category = get_trip_category(request.budget)

    trip = Trip(
        destination=request.destination,
        country=request.country,
        latitude=request.latitude,
        longitude=request.longitude,
        days=request.days,
        budget=request.budget,
        currency=request.currency,
        travel_month=request.travel_month,
        travel_style=request.travel_style,
        category=category,
        daily_budget=daily_budget,
        hotel_cost=request.hotel_cost,
        food_cost=request.food_cost,
        transport_cost=request.transport_cost,
        miscellaneous_cost=request.miscellaneous_cost,
        ai_recommendation=None,
    )

    db = SessionLocal()
    try:
        db.add(trip)
        db.commit()
        db.refresh(trip)
        return trip_to_dict(trip)
    finally:
        db.close()


@app.get("/api/v1/trips")
def list_trips():
    db = SessionLocal()
    try:
        return [trip_to_dict(trip) for trip in db.query(Trip).all()]
    finally:
        db.close()


@app.get("/api/v1/trips/{trip_id}")
def get_trip(trip_id: int):
    db = SessionLocal()
    try:
        trip = db.query(Trip).filter(Trip.id == trip_id).first()
        if trip is None:
            raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")
        return trip_to_dict(trip)
    finally:
        db.close()


@app.put("/api/v1/trips/{trip_id}")
def update_trip(trip_id: int, request: TripRequest):
    """Update an existing trip's inputs in place.

    Used by the edit-and-regenerate flow so that revising a trip does not
    create a duplicate row. The existing ai_recommendation is left alone; the
    client calls /generate straight after to overwrite it.
    """
    db = SessionLocal()
    try:
        trip = db.query(Trip).filter(Trip.id == trip_id).first()
        if trip is None:
            raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")

        trip.destination = request.destination
        trip.country = request.country
        trip.latitude = request.latitude
        trip.longitude = request.longitude
        trip.days = request.days
        trip.budget = request.budget
        trip.currency = request.currency
        trip.travel_month = request.travel_month
        trip.travel_style = request.travel_style
        trip.hotel_cost = request.hotel_cost
        trip.food_cost = request.food_cost
        trip.transport_cost = request.transport_cost
        trip.miscellaneous_cost = request.miscellaneous_cost

        # Derived fields must be recomputed from the new budget/days.
        trip.daily_budget = calculate_daily_budget(request.budget, request.days)
        trip.category = get_trip_category(request.budget)

        db.commit()
        db.refresh(trip)
        return trip_to_dict(trip)
    finally:
        db.close()


@app.delete("/api/v1/trips/{trip_id}")
def delete_trip(trip_id: int):
    db = SessionLocal()
    try:
        trip = db.query(Trip).filter(Trip.id == trip_id).first()
        if trip is None:
            raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")
        db.delete(trip)
        db.commit()
        return {"message": f"Trip with id {trip_id} deleted successfully"}
    finally:
        db.close()


@app.post("/api/v1/trips/{id}/generate")
def generate_trip_recommendation(id: int):
    db = SessionLocal()
    try:
        trip = db.query(Trip).filter(Trip.id == id).first()

        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")

        try:
            recommendation = generate_recommendation(trip)
        except RecommendationError as e:
            # Deliberately not persisted: storing a failed generation would
            # serve an empty itinerary back on every subsequent read.
            raise HTTPException(status_code=502, detail=str(e)) from e

        trip.ai_recommendation = json.dumps(recommendation)

        db.commit()
        db.refresh(trip)
        return trip_to_dict(trip)
    finally:
        db.close()


@app.get("/api/v1/recommendations")
def get_recommendations():
    return {"recommendations": ["Tokyo Tower", "Mount Fuji", "Shibuya"]}


@app.get("/api/v1/transportations")
def get_transportations():
    return {"transportations": ["Bus", "Train", "Flight"]}

