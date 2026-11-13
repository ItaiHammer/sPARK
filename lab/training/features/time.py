from datetime import datetime

ZONE = "America/Los_Angeles"


def minute_of_day(hour: int, minute: int) -> int:
    return hour * 60 + minute


def weekday(target_time: datetime) -> int:
    return target_time.weekday()
