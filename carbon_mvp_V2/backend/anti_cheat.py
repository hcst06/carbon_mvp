def check_cheat(distance, time_minutes, mode=None):
    if time_minutes <= 0:
        return True, "时间异常"

    speed = distance / (time_minutes / 60)

    # 根据不同出行方式的合理速度范围进行检测
    speed_limits = {
        "walk": (0.1, 6),      # 步行：0.1-6 km/h
        "bike": (1, 30),       # 骑行：1-30 km/h
        "bus": (5, 80),        # 公交：5-80 km/h
        "metro": (10, 100)     # 地铁：10-100 km/h
    }

    if mode in speed_limits:
        min_speed, max_speed = speed_limits[mode]
        if speed < min_speed:
            return True, f"速度过慢，疑似作弊（{mode}）"
        if speed > max_speed:
            return True, f"速度过快，疑似作弊（{mode}）"
    else:
        # 通用速度检测
        if speed > 120:
            return True, "速度异常，疑似作弊"

    # 距离异常检测
    if distance > 200:
        return True, "距离异常，超过合理范围"

    # 时间异常检测（根据距离和速度计算合理时间范围）
    if speed > 0:
        estimated_time = distance / speed * 60  # 转换为分钟
        if time_minutes < estimated_time * 0.5 or time_minutes > estimated_time * 2:
            return True, "时间异常，与距离和速度不匹配"

    return False, "正常"