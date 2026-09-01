import json
import logging
from typing import Iterator, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from database import SessionLocal, init_db
from models.trip import Trip
from models.user import User
from services.trip_service import calculate_daily_budget, get_trip_category
from services.bedrock_service import generate_recommendation, RecommendationError
from services.kb_service import ask_knowledge_base, KnowledgeBaseError
from services.auth_service import (
    AuthError,
    MIN_PASSWORD_LENGTH,
    MAX_PASSWORD_BYTES,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

logging.basicConfig(level=logging.INFO)

# Kept in step with the frontend Zod schema. The upper bound keeps the
# generated itinerary comfortably inside the model's output token budget.
MAX_TRIP_DAYS = 30


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class QuestionRequest(BaseModel):
    question: str = Field(min_length=3, max_length=500)


class TripRequest(BaseModel):
    destination: str
    country: str
    country_code: Optional[str] = None
    latitude: float
    longitude: float
    days: int = Field(ge=1, le=MAX_TRIP_DAYS)
    budget: float = Field(gt=0)
    currency: str = "USD"
    travel_month: str
    travel_style: str
    travel_group: str
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

# auto_error=False so a missing header yields our own 401 with a useful message
# rather than FastAPI's bare 403.
bearer_scheme = HTTPBearer(auto_error=False)


def get_db() -> Iterator[Session]:
    """Per-request session. Endpoints using Depends(get_db) must not close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the caller from the Bearer token, or raise 401.

    Every protected endpoint depends on this, so ownership can be derived from
    the token instead of trusting a user_id in the request body.
    """
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None or not credentials.credentials:
        raise unauthorized

    try:
        user_id = decode_access_token(credentials.credentials)
    except AuthError:
        raise unauthorized

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        # Token is validly signed but the account is gone (deleted).
        raise unauthorized

    return user


def user_to_dict(user: User, db: Session) -> dict:
    trips_planned = db.query(Trip).filter(Trip.user_id == user.id).count()
    itineraries_generated = (
        db.query(Trip)
        .filter(Trip.user_id == user.id, Trip.ai_recommendation.isnot(None))
        .count()
    )
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "trips_planned": trips_planned,
        "itineraries_generated": itineraries_generated,
    }


def get_owned_trip(trip_id: int, user: User, db: Session) -> Trip:
    """Fetch a trip the caller owns, or raise.

    404 when it doesn't exist; 403 when it belongs to somebody else — the
    agreed contract for read and write alike.
    """
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip is None:
        raise HTTPException(status_code=404, detail=f"Trip with id {trip_id} not found")
    if trip.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this trip.",
        )
    return trip


def trip_to_dict(trip: Trip) -> dict:
    ai_recommendation = None
    if trip.ai_recommendation:
        try:
            ai_recommendation = json.loads(trip.ai_recommendation)
        except (json.JSONDecodeError, TypeError):
            ai_recommendation = None

    return {
        "id": trip.id,
        "user_id": trip.user_id,
        "destination": trip.destination,
        "country": trip.country,
        "country_code": trip.country_code,
        "created_at": trip.created_at.isoformat() if trip.created_at else None,
        "latitude": trip.latitude,
        "longitude": trip.longitude,
        "days": trip.days,
        "budget": trip.budget,
        "currency": trip.currency,
        "travel_month": trip.travel_month,
        "travel_style": trip.travel_style,
        "travel_group": trip.travel_group,
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


@app.post("/api/v1/auth/register", status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Create an account. Does not issue a token — the client then logs in."""
    if len(request.password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise HTTPException(
            status_code=422,
            detail=f"Password must be at most {MAX_PASSWORD_BYTES} bytes.",
        )

    email = request.email.lower().strip()

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that email already exists.",
        )

    user = User(
        name=request.name.strip(),
        email=email,
        password_hash=hash_password(request.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user_to_dict(user, db)


@app.post("/api/v1/auth/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.lower().strip()).first()

    # One message for both "no such email" and "wrong password" so the endpoint
    # can't be used to enumerate which emails are registered.
    if user is None or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
        "user": user_to_dict(user, db),
    }


@app.get("/api/v1/auth/me")
def read_current_user(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Current user plus profile stats. Backs /profile and session restore."""
    return user_to_dict(user, db)


@app.post("/api/v1/trips")
def create_trip(
    request: TripRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    daily_budget = calculate_daily_budget(request.budget, request.days)
    category = get_trip_category(request.budget)

    trip = Trip(
        # Ownership comes from the verified token, never the request body.
        user_id=user.id,
        destination=request.destination,
        country=request.country,
        country_code=request.country_code,
        latitude=request.latitude,
        longitude=request.longitude,
        days=request.days,
        budget=request.budget,
        currency=request.currency,
        travel_month=request.travel_month,
        travel_style=request.travel_style,
        travel_group=request.travel_group,
        category=category,
        daily_budget=daily_budget,
        hotel_cost=request.hotel_cost,
        food_cost=request.food_cost,
        transport_cost=request.transport_cost,
        miscellaneous_cost=request.miscellaneous_cost,
        ai_recommendation=None,
    )

    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip_to_dict(trip)


@app.get("/api/v1/trips")
def list_trips(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the caller's own trips, newest first.

    Scoped to `user_id` so a user can only ever see their own trips.

    Postgres gives no ordering guarantee without ORDER BY, and the update /
    generate flows rewrite rows in place, which physically moves them in the
    heap. `id` breaks ties for rows predating `created_at`.
    """
    trips = (
        db.query(Trip)
        .filter(Trip.user_id == user.id)
        .order_by(Trip.created_at.desc().nullslast(), Trip.id.desc())
        .all()
    )
    return [trip_to_dict(trip) for trip in trips]


@app.get("/api/v1/trips/{trip_id}")
def get_trip(
    trip_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return trip_to_dict(get_owned_trip(trip_id, user, db))


@app.put("/api/v1/trips/{trip_id}")
def update_trip(
    trip_id: int,
    request: TripRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an existing trip's inputs in place.

    Used by the edit-and-regenerate flow so that revising a trip does not
    create a duplicate row. The existing ai_recommendation is left alone; the
    client calls /generate straight after to overwrite it.

    Rejects with 403 if the trip belongs to another user.
    """
    trip = get_owned_trip(trip_id, user, db)

    trip.destination = request.destination
    trip.country = request.country
    trip.country_code = request.country_code
    trip.latitude = request.latitude
    trip.longitude = request.longitude
    trip.days = request.days
    trip.budget = request.budget
    trip.currency = request.currency
    trip.travel_month = request.travel_month
    trip.travel_style = request.travel_style
    trip.travel_group = request.travel_group
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


@app.delete("/api/v1/trips/{trip_id}")
def delete_trip(
    trip_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete one of the caller's trips. 403 if it belongs to another user."""
    trip = get_owned_trip(trip_id, user, db)
    db.delete(trip)
    db.commit()
    return {"message": f"Trip with id {trip_id} deleted successfully"}


@app.post("/api/v1/trips/{trip_id}/generate")
def generate_trip_recommendation(
    trip_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate (or regenerate) the itinerary for one of the caller's trips."""
    trip = get_owned_trip(trip_id, user, db)

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


@app.post("/api/v1/ask")
def ask_assistant(
    request: QuestionRequest,
    user: User = Depends(get_current_user),
):
    """Answer a travel question grounded in the knowledge base.

    One-shot: no conversation state is kept between calls. Requires a session
    like every other non-auth endpoint. The answer is not persisted; each call
    re-retrieves and re-generates.
    """
    try:
        result = ask_knowledge_base(request.question)
    except KnowledgeBaseError as e:
        # Nothing usable came back from retrieval or generation. Surfaced as a
        # bad-gateway rather than persisted, same rule as the itinerary path.
        raise HTTPException(status_code=502, detail=str(e)) from e

    return {"question": request.question, **result}


@app.get("/api/v1/recommendations")
def get_recommendations():
    return {"recommendations": ["Tokyo Tower", "Mount Fuji", "Shibuya"]}


@app.get("/api/v1/transportations")
def get_transportations():
    return {"transportations": ["Bus", "Train", "Flight"]}

