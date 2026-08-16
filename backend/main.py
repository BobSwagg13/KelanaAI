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
from fastapi import FastAPI


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
@app.post("/api/v1/trips")
def create_trip(request: TripRequest):
    daily_budget = calculate_daily_budget(
        request.budget, request.days
    )
    category = get_trip_category(
        request.budget
    )
    return {
        "destination" : request.destination,
        "budget" : request.budget,
        "daily_budget" : daily_budget,
        "category" : category,
    }

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