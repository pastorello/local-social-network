"""Constants shared by the test suite.

A module rather than a `conftest.py` symbol so the test modules can import it
normally — importing from conftest works but pytest discourages it.
"""

# Satisfies the default AUTH_PASSWORD_VALIDATORS, so fixtures do not trip
# validation while testing something else.
PASSWORD = 'GaetaTest2026!'
