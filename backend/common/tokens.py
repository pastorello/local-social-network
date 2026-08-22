"""Single-use token generation, shared by the invite and password-reset flows.

Kept dependency-free (no model imports) like `common/images.py` — the model
that stores and verifies a token (`account.AccountToken`) owns that logic,
since it needs the database.
"""

import hashlib
import secrets


def generate_raw_token() -> str:
    """The value that goes in the e-mail link. Never stored as-is (see `hash_token`)."""
    return secrets.token_urlsafe(32)


def hash_token(raw: str) -> str:
    """What gets stored, so a leaked database row cannot be replayed as a link."""
    return hashlib.sha256(raw.encode()).hexdigest()
