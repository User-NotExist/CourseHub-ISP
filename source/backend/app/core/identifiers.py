"""Cryptographically random course IDs and join codes."""
import secrets
import string

ALPHABET = string.ascii_letters + string.digits


def random_identifier(length: int) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))
