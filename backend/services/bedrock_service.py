from dotenv import load_dotenv
import boto3
import os

# Load environment variables from .env
load_dotenv()

# Create the Bedrock Runtime client
client = boto3.client(
    service_name="bedrock-runtime",
    region_name=os.getenv("AWS_REGION")
)


def generate_recommendation(trip):
    prompt = f"""
ROLE:
You are KelanaAI, an expert AI travel planner who specializes in creating
realistic, detailed, and enjoyable travel itineraries.

CONTEXT:
The traveler is planning a trip with the following information:

- Destination: {trip.destination}
- Duration: {trip.days} days
- Total Budget: {trip.budget} dollars
- Travel Category: {trip.category}
- Daily Budget: {trip.daily_budget} dollars

TASK:
Create a detailed daily travel itinerary for the entire trip.

For EVERY day, organize the itinerary into exactly three sections:

1. MORNING
- Provide 2-3 specific activities.
- Recommend places that match the destination and travel category.

2. AFTERNOON
- Include cultural sites such as museums, temples, historical landmarks,
  traditional neighborhoods, or other culturally significant locations.
- Include at least one local experience when appropriate.

3. EVENING
- Include at least one dinner recommendation or local food experience.
- Include nightlife or evening entertainment appropriate for the destination
  and travel category.

Make sure the itinerary is realistic and does not require excessive travel
between activities. Prioritize experiences that fit the traveler's category
and daily budget.

OUTPUT:
Return the itinerary using exactly this structure:

Day 1: [Day theme]

Morning:
- [Activity 1]
- [Activity 2]
- [Activity 3]

Afternoon:
- [Cultural site/activity]
- [Local experience/activity]

Evening:
- [Dinner recommendation]
- [Nightlife/evening entertainment]

Repeat this structure for every day of the trip.

Include specific place names and useful details whenever possible.
Do not provide a generic travel guide. Create a practical itinerary that
the traveler could actually follow.
"""

    # Send the prompt using the Converse API
    response = client.converse(
        modelId=os.getenv("MODEL_ID"),
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "text": prompt
                    }
                ]
            }
        ]
    )

    # Extract the AI response
    ai_response = response["output"]["message"]["content"][0]["text"]
    return ai_response
