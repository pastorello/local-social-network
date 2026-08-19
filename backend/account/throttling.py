"""Rate limits for the credential endpoints (TD-18).

Explicit classes rather than `ScopedRateThrottle`, because `@api_view` function
views have no class attribute for the scope to read.

Note for deployment: DRF throttling counts through the Django cache. The default
`LocMemCache` is per-process, so behind several gunicorn workers each worker
keeps its own tally and the effective limit multiplies. A shared cache is a
prerequisite for these numbers to mean what they say — see docs/deploy.md.
"""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Keyed by IP: the caller has no identity yet, that is the point."""

    scope = 'login'


class SignupRateThrottle(AnonRateThrottle):
    scope = 'signup'


class PasswordChangeRateThrottle(UserRateThrottle):
    """Keyed by user — an authenticated action, so no shared-NAT concern."""

    scope = 'password_change'
