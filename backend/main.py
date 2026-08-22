# PART 1 & 2
# from services.trip_service import print_trip_summary, get_trip_category, get_travel_session, calculate_daily_budget


# print_trip_summary("Tokyo", "Japan", 5, 1500, "USD", "July", "Family", 600, 300, 200, 100)
# print_trip_summary("Bali", "Indonesia", 3, 800, "USD", "August", "Backpacker", 200, 250, 400, 50)

# tempat_tujuan = ["Tokyo", "Bali", "Paris", "New York", "London", "Sydney", "Rome", "Barcelona", "Dubai", "Singapore"]

# destination = input("Enter your destination: ")
# country = input("Enter the country: ")
# days = int(input("Enter the number of days: "))
# budget = float(input("Enter your budget: "))
# currency = input("Enter the currency (e.g., USD, EUR): ")
# travel_month = input("Enter the travel month: ")
# travel_style = input("Enter your travel style (e.g., Family, Backpacker, Luxury): ")
# hotel_cost = float(input("Enter the estimated hotel cost: "))
# food_cost = float(input("Enter the estimated food cost: "))
# transport_cost = float(input("Enter the estimated transport cost: "))
# miscellaneous_cost = float(input("Enter the estimated miscellaneous cost: "))

# print_trip_summary(destination, country, days, budget, currency, travel_month, travel_style, hotel_cost, food_cost, transport_cost, miscellaneous_cost, tempat_tujuan)

# PART 3
from unicodedata import category

from services.trip_service import (
    calculate_daily_budget,
    get_trip_category
)
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from services.bedrock_service import generate_recommendation

class TripRequest(BaseModel):
	destination: 	str
	days: 		int
	budget:		float

app = FastAPI()

@app.get("/")
def home():
  return {
    "message" : "Welcome to KelanaAI"
  }


# POST endpoint — receives JSON, returns JSON
# @app.post("/api/v1/trips")
# def create_trip(request: TripRequest):
#     daily_budget = calculate_daily_budget(
#         request.budget, request.days
#     )
#     category = get_trip_category(
#         request.budget
#     )
#     return {
#         "destination" : request.destination,
#         "budget" : request.budget,
#         "daily_budget" : daily_budget,
#         "category" : category,
#     }

@app.get("/api/v1/recommendations")
def get_recommendations():
    return {
        "recommendations": ["Tokyo Tower", "Mount Fuji", "Shibuya"]
    }

@app.get("/api/v1/transportations")
def get_transportations():
    return {
        "transportations": ["Bus", "Train", "Flight"]
    }

# PART 4
from fastapi import FastAPI
from models.trip import Trip
from database import SessionLocal, init_db

app = FastAPI()

init_db()

...

@app.post("/api/v1/trips")
def create_trip(request: TripRequest):
    # reuse Session 2 business logic
    daily_budget = calculate_daily_budget(request.budget, request.days)
    category     = get_trip_category(request.budget)

    # create a Trip ORM object
    trip = Trip(
        destination  = request.destination,
        days         = request.days,
        budget       = request.budget,
        category     = category,
        daily_budget = daily_budget,
        ai_recommendation = None
    )

    # save to PostgreSQL
    db = SessionLocal()
    db.add(trip)
    db.commit()
    db.refresh(trip)   # get the auto-generated id
    db.close()
    return trip

@app.get("/api/v1/trips")
def list_trips():
    db = SessionLocal()
    trips = db.query(Trip).all()
    db.close()
    return trips

@app.get("/api/v1/trips/{trip_id}")
def get_trip(trip_id: int):

    db = SessionLocal()

    trip = db.query(Trip).filter(Trip.id == trip_id).first()

    db.close()

    if trip is None:
        raise HTTPException(
            status_code=404,
            detail=f"Trip with id {trip_id} not found"
        )

    return trip

@app.delete("/api/v1/trips/{trip_id}")
def delete_trip(trip_id: int):
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip is None:
        db.close()
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")
    db.delete(trip)
    db.commit()
    db.close()
    return {"message": f"Trip with id {trip_id} deleted successfully"}

@app.put("/api/v1/trips/{trip_id}")
def update_budget(trip_id: int, request: TripRequest):
    db = SessionLocal()
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip is None:
        db.close()
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")
    daily_budget = calculate_daily_budget(
            request.budget, trip.days
        )
    trip.category = get_trip_category(
            request.budget
        )
    trip.daily_budget = daily_budget
    db.commit()
    db.refresh(trip)
    db.close()
    return trip

@app.post("/api/v1/trips/{id}/generate")
def generate_trip_recommendation(id: int):
    db = SessionLocal()
    # Get trip from database
    trip = db.query(Trip).filter(Trip.id == id).first()

    # Check if trip exists
    if not trip:
        raise HTTPException(
            status_code=404,
            detail="Trip not found"
        )

    # Generate AI recommendation using Bedrock
    recommendation = generate_recommendation(trip)

    # Save AI recommendation to database
    trip.ai_recommendation = recommendation

    db.commit()
    db.refresh(trip)

    print(recommendation)

    # Return the generated recommendation
    return {
        "trip_id": trip.id,
        "destination": trip.destination,
        "ai_recommendation": recommendation
    }