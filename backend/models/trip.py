from sqlalchemy import (
    Column, Integer, String, Float, Text, LargeBinary, DateTime, ForeignKey, func
)
from sqlalchemy.orm import relationship
from database import Base

class Trip(Base):
    __tablename__ = "trips"

    id           = Column(Integer, primary_key=True)
    # Owner. NOT NULL and FK-enforced: every trip belongs to exactly one user,
    # and the API always sets this from the authenticated token, never from the
    # request body — otherwise a client could forge ownership.
    user_id      = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    destination  = Column(String,   nullable=False)
    country      = Column(String,   nullable=False)
    # ISO 3166-1 alpha-2, lowercase, as returned by Nominatim. Nullable because
    # rows created before this column existed have no code, and an ocean click
    # yields no country at all.
    country_code = Column(String,   nullable=True)
    latitude     = Column(Float,    nullable=False)
    longitude    = Column(Float,    nullable=False)
    days         = Column(Integer,  nullable=False)
    budget       = Column(Float,    nullable=False)
    currency     = Column(String,   nullable=False, default='USD')
    travel_month = Column(String,   nullable=False)
    # Trip pace/budget style: backpacker, standard, luxury, adventure, cultural.
    travel_style = Column(String,   nullable=False)
    # Who's traveling: solo, couple, family. An independent axis from
    # travel_style — a trip can be both "backpacker" and "family". Nullable at
    # the DB level: rows created before this column existed have none, and the
    # ones that stored solo/couple/family IN travel_style get backfilled by the
    # migration, which can't retroactively require every historic row to have it.
    travel_group = Column(String,   nullable=True)
    category     = Column(String,   nullable=False)
    daily_budget = Column(Float,    nullable=False)

    hotel_cost         = Column(Float, nullable=True)
    food_cost          = Column(Float, nullable=True)
    transport_cost     = Column(Float, nullable=True)
    miscellaneous_cost = Column(Float, nullable=True)

    ai_recommendation = Column(Text, nullable=True)

    # Hero photo of the destination, fetched from Pixabay when the trip is
    # created. Nullable throughout: the lookup is decorative and must never
    # block a trip from being created, and rows predating the feature have none.
    #
    # The JPEG itself is stored here rather than hotlinked — Pixabay forbids
    # permanent hotlinking and its webformatURL expires after 24h. At ~70 KB a
    # photo this is far cheaper than standing up object storage. It is served by
    # GET /api/v1/trips/{id}/image and deliberately never included in
    # trip_to_dict, which would put it in every list response.
    #
    # Pixabay also requires crediting the contributor wherever the image is
    # shown, so the credit is stored with it.
    image_data         = Column(LargeBinary, nullable=True)
    image_credit_name  = Column(String, nullable=True)
    image_credit_url   = Column(String, nullable=True)

    # Nullable with no backfill: rows that predate this column genuinely have no
    # known creation time, and stamping them with the migration timestamp would
    # render a month-old trip as "created just now". New rows get it from the DB.
    created_at = Column(
        DateTime(timezone=True), nullable=True, server_default=func.now()
    )

    user = relationship("User", back_populates="trips")
