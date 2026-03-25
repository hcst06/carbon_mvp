def calculate_carbon(distance, mode):
    emission_map = {
        "walk": 0,
        "bike": 0,
        "bus": 80,
        "metro": 60
    }

    car_emission = 200

    if mode not in emission_map:
        return None

    reduction = distance * (car_emission - emission_map[mode])
    points = reduction / 100

    return round(reduction, 2), round(points, 2)