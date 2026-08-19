"""Project-wide pytest fixtures.

Deliberately minimal for now: consolidating the six fixtures that are
copy-pasted across the three `tests.py` modules is TD-23, and belongs with
TD-05 (the fast password hasher) in its own session.
"""

import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def reset_throttle_cache():
    """DRF counts throttled requests in the Django cache, which is process-wide.

    Without this, the rate-limit tests would poison every later test in the
    session — and the order they ran in would decide which ones failed (TD-18).
    """
    cache.clear()
    yield
    cache.clear()
