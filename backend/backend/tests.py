"""Settings guardrails (TD-11).

These run Django in a subprocess because the thing under test happens at
settings-import time, which has already happened by the time a test runs.
Each case scrubs PYTEST_VERSION from the child environment: settings.py treats
that variable as "we are under test", and every guard here is about what
happens when we are *not*.
"""

import os
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Printed by the child so the parent can read the resolved settings back out.
PROBE = (
    'import django; django.setup();'
    'from django.conf import settings;'
    'print("DEBUG=", settings.DEBUG, sep="");'
    'print("SECRET_KEY=", settings.SECRET_KEY, sep="");'
    'print("SSL_REDIRECT=", getattr(settings, "SECURE_SSL_REDIRECT", None), sep="")'
)


def run_django(**env_overrides):
    """Import the settings module in a clean subprocess. Returns CompletedProcess."""
    env = dict(os.environ)
    env.pop('PYTEST_VERSION', None)          # otherwise TESTING short-circuits the guards
    env.pop('DJANGO_SECRET_KEY', None)
    env.pop('DJANGO_DEBUG', None)
    env['DJANGO_SETTINGS_MODULE'] = 'backend.settings'
    for key, value in env_overrides.items():
        if value is None:
            env.pop(key, None)
        else:
            env[key] = value
    return subprocess.run(
        [sys.executable, '-c', PROBE],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
    )


def value_of(result, key):
    for line in result.stdout.splitlines():
        if line.startswith(f'{key}='):
            return line.split('=', 1)[1]
    raise AssertionError(f'{key} not in child output: {result.stdout!r} {result.stderr!r}')


# --- SECRET_KEY (TD-11) ---

def test_missing_secret_key_is_fatal_when_debug_is_off():
    """The whole finding: a deploy that forgets the key must not boot silently.

    SimpleJWT signs with SECRET_KEY, so a public fallback here means anyone who
    can read this repo can mint an admin token.
    """
    result = run_django(DJANGO_DEBUG='false')

    assert result.returncode != 0, 'settings imported cleanly without a secret key'
    assert 'DJANGO_SECRET_KEY' in result.stderr
    assert 'ImproperlyConfigured' in result.stderr


def test_secret_key_from_the_environment_is_used():
    result = run_django(DJANGO_DEBUG='false', DJANGO_SECRET_KEY='a-real-deployment-key')

    assert result.returncode == 0, result.stderr
    assert value_of(result, 'SECRET_KEY') == 'a-real-deployment-key'


def test_debug_run_falls_back_to_a_local_only_key():
    """Bare-metal development still works without any environment at all."""
    result = run_django(DJANGO_DEBUG='true')

    assert result.returncode == 0, result.stderr
    assert value_of(result, 'SECRET_KEY').startswith('django-insecure-')


def test_no_committed_key_survives_as_a_production_fallback():
    """Guards the shape of the fix, not just its behaviour.

    The dev fallback must be recognisable as local-only. If someone re-adds a
    real-looking generated key here, this fails.
    """
    settings_source = (BACKEND_DIR / 'backend' / 'settings.py').read_text()

    assert 'django-insecure-kdh@5dsjmu83w1ep61' not in settings_source, (
        'the original committed SECRET_KEY is back in settings.py'
    )


# --- DEBUG (TD-11) ---

def test_debug_defaults_to_off():
    """Fail-safe: an unset DJANGO_DEBUG must not mean "show tracebacks"."""
    result = run_django(DJANGO_SECRET_KEY='a-real-deployment-key')

    assert result.returncode == 0, result.stderr
    assert value_of(result, 'DEBUG') == 'False'


@pytest.mark.parametrize('raw,expected', [('true', 'True'), ('True', 'True'), ('false', 'False')])
def test_debug_opt_in_is_case_insensitive(raw, expected):
    # A key is supplied so this measures the DEBUG parsing alone — without one,
    # the 'false' case would be caught by the secret-key guard instead.
    result = run_django(DJANGO_DEBUG=raw, DJANGO_SECRET_KEY='a-real-deployment-key')

    assert result.returncode == 0, result.stderr
    assert value_of(result, 'DEBUG') == expected


# --- the hardening block must not fire under test (regression guard) ---

def test_https_hardening_is_off_while_testing():
    """SECURE_SSL_REDIRECT would 301 every request the test client makes.

    Flipping the DEBUG default turned the whole suite red until the hardening
    block learned about TESTING; this keeps it that way.
    """
    from django.conf import settings

    assert settings.TESTING is True
    assert getattr(settings, 'SECURE_SSL_REDIRECT', False) is False


# --- exception handler (TD-14 net, TD-18 copy) ---


def test_handler_translates_djangos_own_validation_error():
    """DRF's handler knows APIException, Http404 and PermissionDenied only, so a
    Django ValidationError escaped as a 500. This is the net behind the explicit
    parameter guards."""
    from django.core.exceptions import ValidationError as DjangoValidationError

    from backend.exceptions import api_exception_handler

    response = api_exception_handler(DjangoValidationError({'category': ['Non valido.']}), {})

    assert response is not None
    assert response.status_code == 400
    assert response.data['fields']['category'] == ['Non valido.']


def test_handler_translates_a_bare_django_validation_error():
    from django.core.exceptions import ValidationError as DjangoValidationError

    from backend.exceptions import api_exception_handler

    response = api_exception_handler(DjangoValidationError('Non valido.'), {})

    assert response.status_code == 400
    assert 'Non valido.' in str(response.data['fields'])


def test_throttle_responses_speak_italian():
    """UI copy is Italian (N4); DRF's default throttle message is English."""
    from rest_framework.exceptions import Throttled

    from backend.exceptions import api_exception_handler

    response = api_exception_handler(Throttled(wait=42), {})

    assert response.status_code == 429
    assert 'Troppi tentativi' in response.data['detail']
    assert '42' in response.data['detail']
