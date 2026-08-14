def print_trip_summary(destination: str, country: str, days: int, budget: float, currency: str, travel_month: str, travel_style: str, hotel_cost: float, food_cost: float, transport_cost: float, miscellaneous_cost: float, tempat_tujuan: list) -> None:
    print("=" * 25)
    print("\nKelana AI\n")
    print("=" * 25)
    print(f"Destination          : {destination}")
    print(f"Country              : {country}")
    print(f"Days                 : {days}")
    print(f"Budget               : {budget} {currency}")
    print(f"Travel Style         : {travel_style}")
    print(f"Hotel Cost           : {hotel_cost} {currency}")
    print(f"Food Cost            : {food_cost} {currency}")
    print(f"Transport Cost       : {transport_cost} {currency}")
    print(f"Miscellaneous Cost   : {miscellaneous_cost} {currency}")
    total = hotel_cost + food_cost + transport_cost + miscellaneous_cost
    print(f"Total Estimated Cost : {total} {currency}")
    if(total > budget):
        print(f"Budget exceeded.")
    category = get_trip_category(budget)
    daily = calculate_daily_budget(budget, days)
    print(f"{category} · {daily} USD/day")
    print("\nRecommended Places")
    for place in tempat_tujuan:
        print(f"- {place}")
    

def get_trip_category(budget: int):
    if budget <= 700:
        return "Backpacker"
    elif 700 < budget <= 2000:
        return "Standard"
    else:
        return "Luxury"

def get_travel_session(month: str):
    month = month.lower()
    if month.lower() == "december":
        return "Peak Season"
    elif month.lower() == "june":
        return "Holiday Season"
    else:
        return "Regular Season"

def calculate_daily_budget(budget: int, days: int) -> float:
    if(days <= 0):
        raise ValueError("Number of days must be greater than zero.")
    return budget / days


