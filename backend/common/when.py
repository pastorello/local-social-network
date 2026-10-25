"""Gaeta's clock, for the things that happen on a date: events and the feasts'
editions (spec cosa-fare.md Part −1 D9, CF1, CF2, CF26, CF29, CF34).

A plain package, like `images.py`: both `eventi` and `feste` read it, and
neither should import the other to know what day it is.

Nothing here runs on its own. "Not over yet" is a comparison made when a
request arrives (CF26): no job expires an event, nothing deletes one.
"""

from datetime import timedelta

from django.utils import timezone

# CF2: the tourist day ends at five in the morning, not at midnight. The 22:00
# concert is Saturday's, still listed at 00:40 on the calendar's Sunday and
# gone by five, when nobody is reading. Internal: no page ever prints it.
DAY_ENDS_AT_HOUR = 5

# CF29: a range longer than this is a mistyped year, not a festival.
MAX_SPAN_DAYS = 60

# «Questa settimana» is today and the six days after it (D9, left to the build
# and decided by default).
WEEK_DAYS = 7

WINDOWS = ('oggi', 'settimana')

SPAN_TOO_LONG = f'Dura al massimo {MAX_SPAN_DAYS} giorni: controlla le date, e l’anno.'
ENDS_BEFORE_IT_STARTS = 'La fine viene prima dell’inizio.'
ALREADY_OVER = 'Questa data è già passata: controlla il giorno e l’anno.'


def tourist_day():
    """The day in Gaeta that the listings are for. `TIME_ZONE` is Europe/Rome
    (CF1), so `localtime()` is Gaeta's wall clock; five hours back is CF2's
    boundary."""
    return (timezone.localtime() - timedelta(hours=DAY_ENDS_AT_HOUR)).date()


def window_bounds(name, today=None):
    """The first and last day of a window, both included."""
    today = today or tourist_day()
    if name == 'oggi':
        return today, today
    if name == 'settimana':
        return today, today + timedelta(days=WEEK_DAYS - 1)
    raise ValueError(name)


def span_problem(start, end):
    """What is wrong with a range on any day, or None."""
    if end < start:
        return ENDS_BEFORE_IT_STARTS
    if (end - start).days > MAX_SPAN_DAYS:
        return SPAN_TOO_LONG
    return None


def past_problem(end, today=None):
    """CF34: a date that has already gone by is refused when it is written —
    the form's guard against a mistyped day or year. Something that has begun
    and not ended (the Luminarie, filed on their third night) is not past."""
    if end < (today or tourist_day()):
        return ALREADY_OVER
    return None


def dates_problems(start, end, stored=None):
    """What is wrong with a range, by field, for both write paths of events and
    of editions. `stored` is the `(start, end)` already saved, if any: the past
    is checked only when the dates are written — new, or changed — so a
    festival that has begun can still have its line corrected."""
    if start is None:
        return {}
    problem = span_problem(start, end)
    if problem:
        return {'end_date': problem}
    problem = past_problem(end) if stored != (start, end) else None
    if problem:
        return {'start_date': problem}
    return {}
