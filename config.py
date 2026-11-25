import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")

    raw_db_url = (os.environ.get("DATABASE_URL") or "").strip()
    if not raw_db_url:
        db_url = "sqlite:///proxihome.db"
    elif raw_db_url.startswith("postgres://"):
        db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
    else:
        db_url = raw_db_url

    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    TURNSTILE_SITE_KEY = os.environ.get(
        "TURNSTILE_SITE_KEY", "1x00000000000000000000AA"
    )
    TURNSTILE_SECRET_KEY = os.environ.get(
        "TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA"
    )

    ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "ProxiHome59290!")
    CONTACT_EMAIL = os.environ.get(
        "CONTACT_EMAIL", "contact@proxihome-wasquehal.fr"
    )