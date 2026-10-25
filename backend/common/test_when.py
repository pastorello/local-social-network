"""Gaeta's clock (spec cosa-fare.md CF1): named in the settings since the archive
stores calendar dates (review PR-27), so a bare `localdate()` is Gaeta's day."""

from datetime import date, datetime
from unittest import mock
from zoneinfo import ZoneInfo

from django.conf import settings
from django.utils import timezone

from common.when import window_bounds


def test_the_server_reads_gaetas_wall_clock_not_utcs():
    # 23:30 UTC on 9 August is already 10 August in Gaeta (summer time).
    late = datetime(2026, 8, 9, 23, 30, tzinfo=ZoneInfo('UTC'))

    assert settings.TIME_ZONE == 'Europe/Rome'
    with mock.patch('django.utils.timezone.now', return_value=late):
        assert timezone.localdate() == date(2026, 8, 10)


def test_a_week_is_today_and_the_six_days_after():
    today = date(2026, 12, 29)

    assert window_bounds('oggi', today) == (today, today)
    assert window_bounds('settimana', today) == (today, date(2027, 1, 4))
