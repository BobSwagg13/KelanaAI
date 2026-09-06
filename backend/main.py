import json
import logging
import os
from typing import Iterator, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import SessionLocal, init_db
from models.trip import Trip
from models.user import User
from models.conversation import Conversation
from models.message import Message
from services.trip_service import calculate_daily_budget, get_trip_category
from services.bedrock_service import generate_recommendation, RecommendationError
from services.kb_service import generate_reply, generate_title, KnowledgeBaseError
from services.image_service import fetch_trip_image
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

# Kept in step with the frontend Zod schema. Generation splits the itinerary
# across concurrent batched calls, so this is a product decision about how long
# a trip we plan for — not a model output-token limit as it once was.
MAX_TRIP_DAYS = 30


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CreateMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=4000)


class RenameConversationRequest(BaseModel):
    title: str = Field(min_length=1, max_length=256)


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

# Browser origins allowed to call the API. localhost is for local dev; extra
# production origins come from FRONTEND_URL (comma-separated for more than one)
# so they can be set per environment without a code change. Vercel gives each
# deployment its own hostname, so preview/branch URLs are matched by regex
# rather than enumerated.
_frontend_url = os.getenv("FRONTEND_URL", "")
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://kelanaai.com",
    *(o.strip() for o in _frontend_url.split(",") if o.strip()),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://kelana[a-z0-9-]*\.vercel\.app",
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


def get_owned_conversation(conversation_id: int, user: User, db: Session) -> Conversation:
    """Fetch a conversation the caller owns, or raise. Same 404/403 contract as trips."""
    conversation = (
        db.query(Conversation).filter(Conversation.id == conversation_id).first()
    )
    if conversation is None:
        raise HTTPException(
            status_code=404, detail=f"Conversation with id {conversation_id} not found"
        )
    if conversation.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this conversation.",
        )
    return conversation


def message_to_dict(message: Message) -> dict:
    sources = None
    if message.sources:
        try:
            sources = json.loads(message.sources)
        except (json.JSONDecodeError, TypeError):
            sources = None

    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "role": message.role,
        "content": message.content,
        "sources": sources,
        "created_at": message.created_at.isoformat() if message.created_at else None,
    }


def conversation_to_dict(conversation: Conversation, *, with_messages: bool = False) -> dict:
    data = {
        "id": conversation.id,
        "user_id": conversation.user_id,
        "title": conversation.title,
        "created_at": conversation.created_at.isoformat() if conversation.created_at else None,
        "updated_at": conversation.updated_at.isoformat() if conversation.updated_at else None,
        "message_count": len(conversation.messages),
    }
    if with_messages:
        data["messages"] = [message_to_dict(m) for m in conversation.messages]
    return data


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
        "image_url": trip.image_url,
        "image_credit_name": trip.image_credit_name,
        "image_credit_url": trip.image_credit_url,
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

    # Decorative, and deliberately after the commit: the trip is already saved,
    # so a slow or failing Pixabay lookup costs a photo, never the trip. Needs
    # the id, which only exists once the row is written.
    image = fetch_trip_image(trip.destination, trip.id)
    if image:
        trip.image_url = image["url"]
        trip.image_credit_name = image["credit_name"]
        trip.image_credit_url = image["credit_url"]
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


@app.get("/api/v1/conversations")
def list_conversations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """The caller's conversations, most recent activity first."""
    conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc(), Conversation.id.desc())
        .all()
    )
    return [conversation_to_dict(c) for c in conversations]


@app.post("/api/v1/conversations", status_code=status.HTTP_201_CREATED)
def create_conversation(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start an empty conversation. The title stays null until the first exchange."""
    conversation = Conversation(user_id=user.id)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation_to_dict(conversation, with_messages=True)


@app.get("/api/v1/conversations/{conversation_id}")
def get_conversation(
    conversation_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = get_owned_conversation(conversation_id, user, db)
    return conversation_to_dict(conversation, with_messages=True)


@app.patch("/api/v1/conversations/{conversation_id}")
def rename_conversation(
    conversation_id: int,
    request: RenameConversationRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = get_owned_conversation(conversation_id, user, db)
    conversation.title = request.title.strip()
    db.commit()
    db.refresh(conversation)
    return conversation_to_dict(conversation)


@app.delete("/api/v1/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = get_owned_conversation(conversation_id, user, db)
    db.delete(conversation)
    db.commit()
    return {"message": f"Conversation with id {conversation_id} deleted successfully"}


@app.post("/api/v1/conversations/{conversation_id}/messages", status_code=status.HTTP_201_CREATED)
def post_message(
    conversation_id: int,
    request: CreateMessageRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add the user's message, generate the grounded reply, persist both.

    Returns the two new messages plus the conversation (its title may have just
    been generated). A generation failure is a 502 and leaves nothing behind —
    same rule as the itinerary path.
    """
    conversation = get_owned_conversation(conversation_id, user, db)

    history = [{"role": m.role, "content": m.content} for m in conversation.messages]
    content = request.content.strip()

    try:
        result = generate_reply(history, content)
    except KnowledgeBaseError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    user_message = Message(conversation_id=conversation.id, role="user", content=content)
    assistant_message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=result["answer"],
        sources=json.dumps(result["sources"]) if result["sources"] else None,
    )
    db.add_all([user_message, assistant_message])

    # First exchange: name the conversation from it. A title failure falls back
    # inside generate_title, so this never blocks the reply.
    if conversation.title is None and not history:
        conversation.title = generate_title(content, result["answer"])

    # Touch updated_at so the history list resurfaces this thread.
    conversation.updated_at = func.now()

    db.commit()
    db.refresh(conversation)
    db.refresh(user_message)
    db.refresh(assistant_message)

    return {
        "conversation": conversation_to_dict(conversation),
        "user_message": message_to_dict(user_message),
        "assistant_message": message_to_dict(assistant_message),
    }


@app.get("/api/v1/recommendations")
def get_recommendations():
    return {"recommendations": ["Tokyo Tower", "Mount Fuji", "Shibuya"]}


@app.get("/api/v1/transportations")
def get_transportations():
    return {"transportations": ["Bus", "Train", "Flight"]}

