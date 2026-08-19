"""Project-wide pytest fixtures (TD-23).

These six — `api_client`, `citizen`, `other_citizen`, `admin`, `make_client`
and the autouse `media_root` — were copy-pasted verbatim across
`account/tests.py`, `reports/tests.py` and `polls/tests.py`. Fixtures are
function-scoped, so the duplication was never a correctness problem; it was
three places to change one thing, and it is why the suite creates users in 44
places (see TD-05, whose fast hasher lives in settings.py).

Module-specific fixtures stay in their own file: `category` and `make_report`
in reports, `make_poll` in polls, `auth_client` in account.
"""

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from account.models import User
from common.testing import PASSWORD


@pytest.fixture(autouse=True)
def reset_throttle_cache():
    """DRF counts throttled requests in the Django cache, which is process-wide.

    Without this, the rate-limit tests would poison every later test in the
    session — and the order they ran in would decide which ones failed (TD-18).
    """
    cache.clear()
    yield
    cache.clear()


@pytest.fixture(autouse=True)
def media_root(settings, tmp_path):
    """Keep uploaded files out of the working tree, for every test.

    Previously autouse in `reports/tests.py` only. Nothing else uploaded at the
    time, so there was no pollution — but that held by luck, not by design, and
    stopped being true when the avatar tests arrived.
    """
    settings.MEDIA_ROOT = tmp_path


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def citizen():
    return User.objects.create_user(
        name='Cittadino Uno', email='cittadino@example.com', password=PASSWORD
    )


@pytest.fixture
def other_citizen():
    return User.objects.create_user(
        name='Cittadino Due', email='altro@example.com', password=PASSWORD
    )


@pytest.fixture
def admin():
    user = User.objects.create_user(
        name='Amministratore', email='admin@example.com', password=PASSWORD
    )
    user.role = User.ADMIN
    user.save(update_fields=('role',))
    return user


@pytest.fixture
def make_client():
    """Authenticate without going through the login endpoint."""
    def _make(user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    return _make
