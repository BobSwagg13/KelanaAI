def print_trip_summary(destination: str, country: str, days: int, budget: float, currency: str, travel_month: str, travel_style: str, hotel_cost: float, food_cost: float, transport_cost: float, miscellaneous_cost: float):
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

# print_trip_summary("Tokyo", "Japan", 5, 1500, "USD", "July", "Family", 600, 300, 200, 100)
# print_trip_summary("Bali", "Indonesia", 3, 800, "USD", "August", "Backpacker", 200, 250, 400, 50)

destination = input("Enter your destination: ")
country = input("Enter the country: ")
days = int(input("Enter the number of days: "))
budget = float(input("Enter your budget: "))
currency = input("Enter the currency (e.g., USD, EUR): ")
travel_month = input("Enter the travel month: ")
travel_style = input("Enter your travel style (e.g., Family, Backpacker, Luxury): ")
hotel_cost = float(input("Enter the estimated hotel cost: "))
food_cost = float(input("Enter the estimated food cost: "))
transport_cost = float(input("Enter the estimated transport cost: "))
miscellaneous_cost = float(input("Enter the estimated miscellaneous cost: "))

print_trip_summary(destination, country, days, budget, currency, travel_month, travel_style, hotel_cost, food_cost, transport_cost, miscellaneous_cost)