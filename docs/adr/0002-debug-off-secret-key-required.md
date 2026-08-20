# ADR-0002: `DJANGO_DEBUG` defaults off and `DJANGO_SECRET_KEY` is required

## Status

Accepted — the developer-experience cost below has not been ratified by the
author and may be reversed.

## Date

2026-08-19

## Context

`settings.py` used to fall back to a committed `django-insecure-…` key.
SimpleJWT signs with `SECRET_KEY`, so anyone who could read the repository could
mint a valid **admin** token against a deployment that forgot the variable, and
nothing warned: the app booted and looked healthy.

The two defaults are coupled. Hardening the key while `DJANGO_DEBUG` still
defaulted to `true` would have left the original hole, because the guard only
fires when debug is off.

## Decision

`DJANGO_DEBUG` defaults to `false`. `SECRET_KEY` has no committed fallback:
missing, and not `DEBUG or TESTING`, raises `ImproperlyConfigured` at import
time. Development opts in explicitly.

## Alternatives considered

**Keep the dev-friendly `DEBUG=true` default, guard only the key.** Cheaper for
developers, and it leaves the exact failure the audit described: a host that
never sets `DJANGO_DEBUG` gets tracebacks *and* the shared signing key.

**Infer development from `sys.argv` (e.g. `runserver` implies debug).** Keeps
bare-metal frictionless, but couples a security default to how the process was
launched — clever in a place where boring is worth more.

## Consequences

- Bare-metal `manage.py` commands need `DJANGO_DEBUG=true` in the shell. This is
  a real cost to the secondary development path, paid so the default is
  fail-safe. `docker compose` already passes it; pytest is exempt via `TESTING`.
- The HTTPS hardening block carries `and not TESTING`: without it
  `SECURE_SSL_REDIRECT` answers the test client with a 301 and the whole suite
  goes red.
- A deployment that forgets the key fails loudly at startup instead of running
  insecurely. That is the point.
