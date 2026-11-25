import random
import string
import requests
from flask import current_app, request
from app import db
from app.models import SecurityLog

def generate_reference():
    chars = string.ascii_uppercase + string.digits
    code = ''.join(random.choices(chars, k=6))
    return f"PX-{code}"

def verify_turnstile(token):
    if not token:
        return False
    secret = current_app.config['TURNSTILE_SECRET_KEY']
    # Clé de test Cloudflare officielle
    if secret == '1x0000000000000000000000000000000AA':
        return True
    try:
        resp = requests.post(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            data={'secret': secret, 'response': token},
            timeout=5
        )
        return resp.json().get('success', False)
    except Exception:
        return False

def log_security_event(event_type, actor, details, record_ip=True):
    ip = None
    if record_ip and request:
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        if ip and ',' in ip:
            ip = ip.split(',')[0].strip()
    log = SecurityLog(
        event_type=event_type,
        actor=actor,
        details=details,
        ip_address=ip
    )
    db.session.add(log)
    db.session.commit()