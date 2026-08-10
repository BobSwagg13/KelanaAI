def print_trip_summary(destination, days, budget, travel_style, hotel_cost, food_cost, transport_cost, miscellaneous_cost):
    print("=" * 25)
    print("Kelana AI")
    print("=" * 25)
    print(f"Destination          : {destination}")
    print(f"Days                 : {days}")
    print(f"Budget               : {budget}")
    print(f"Travel Style         : {travel_style}")
    print(f"Hotel Cost           : {hotel_cost}")
    print(f"Food Cost            : {food_cost}")
    print(f"Transport Cost       : {transport_cost}")
    print(f"Miscellaneous Cost   : {miscellaneous_cost}")
    total = hotel_cost + food_cost + transport_cost + miscellaneous_cost
    print(f"Total Estimated Cost : {total}")
    if(total > budget):
        print(f"Budget exceeded.")

print_trip_summary("Japan", 5, 1500, "Family", 600, 300, 200, 100)
print_trip_summary("Bali", 3, 800, "Backpacker", 200, 250, 400, 50)