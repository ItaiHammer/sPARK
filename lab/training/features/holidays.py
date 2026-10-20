from datetime import date
from functools import cache

from pandas.tseries.holiday import USFederalHolidayCalendar


@cache
def us_holidays(year: int) -> frozenset[date]:
    calendar = USFederalHolidayCalendar()
    dates = calendar.holidays(start=f"{year}-01-01", end=f"{year}-12-31")
    return frozenset(dates.date)


def is_us_holiday(target_date: date) -> int:
    """Return 1 on an observed U.S. federal holiday, otherwise 0."""
    return int(target_date in us_holidays(target_date.year))
