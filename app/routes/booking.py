import random
from datetime import datetime
from flask import Blueprint, render_template, request, jsonify, session
from app import db
from app.models import Booking, BookingHistory, AvailabilityConfig
from app.utils import generate_reference, log_security_event

booking_bp = Blueprint('booking', __name__)

@booking_bp.route('/reserver')
def booking_page():
    code = f"{random.randint(1000, 9999)}"
    session['fake_captcha_code'] = code
    session['fake_captcha_verified'] = False
    return render_template('booking.html', captcha_code=code)

@booking_bp.route('/api/verify-captcha', methods=['POST'])
def verify_fake_captcha():
    data = request.get_json() or {}
    user_input = (data.get('code') or '').strip()
    expected = session.get('fake_captcha_code')

    if not user_input or user_input != expected:
        new_code = f"{random.randint(1000, 9999)}"
        session['fake_captcha_code'] = new_code
        session['fake_captcha_verified'] = False
        return jsonify({
            'success': False,
            'message': 'Code incorrect. Un nouveau code a été généré.',
            'new_code': new_code
        }), 400

    session['fake_captcha_verified'] = True
    return jsonify({'success': True})

@booking_bp.route('/api/slots', methods=['GET'])
def get_available_slots():
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'error': 'Date requise'}), 400

    try:
        dt = datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Format de date invalide'}), 400

    config = AvailabilityConfig.query.first()
    working_days = [int(d) for d in config.working_days.split(',') if d.strip()]
    blocked_dates = [d.strip() for d in config.blocked_dates.split(',') if d.strip()]

    if dt.weekday() not in working_days or date_str in blocked_dates:
        return jsonify({'slots': [], 'closed': True})

    all_slots = [s.strip() for s in config.time_slots.split(',') if s.strip()]
    existing_bookings = Booking.query.filter(
        Booking.booking_date == date_str,
        Booking.status != 0
    ).all()

    counts = {}
    for b in existing_bookings:
        counts[b.booking_time] = counts.get(b.booking_time, 0) + 1

    slots_data = []
    for slot in all_slots:
        booked_count = counts.get(slot, 0)
        slots_data.append({
            'time': slot,
            'available': booked_count < config.max_per_slot
        })

    return jsonify({'slots': slots_data, 'closed': False})

@booking_bp.route('/api/book', methods=['POST'])
def create_booking():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'Données invalides.'}), 400

    # Vérification de la fausse vérification validée en session
    if not session.get('fake_captcha_verified'):
        return jsonify({'success': False, 'message': 'Veuillez valider la vérification anti-robot.'}), 400

    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    address = data.get('address', '').strip()
    postal_code = data.get('postal_code', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()
    booking_date = data.get('booking_date', '').strip()
    booking_time = data.get('booking_time', '').strip()
    accepted = data.get('accepted', False)

    if not all([first_name, last_name, address, postal_code, email, phone, booking_date, booking_time]):
        return jsonify({'success': False, 'message': 'Tous les champs sont obligatoires.'}), 400

    if postal_code != '59290':
        return jsonify({'success': False, 'message': 'Service exclusivement réservé à Wasquehal (59290).'}), 400

    if not accepted:
        return jsonify({'success': False, 'message': 'Vous devez accepter le tarif de 10 € en espèces.'}), 400

    config = AvailabilityConfig.query.first()
    existing_count = Booking.query.filter(
        Booking.booking_date == booking_date,
        Booking.booking_time == booking_time,
        Booking.status != 0
    ).count()

    if existing_count >= config.max_per_slot:
        return jsonify({'success': False, 'message': 'Ce créneau vient d\'être réservé. Veuillez en choisir un autre.'}), 409

    ref = generate_reference()
    while Booking.query.filter_by(reference=ref).first():
        ref = generate_reference()

    new_booking = Booking(
        reference=ref,
        first_name=first_name,
        last_name=last_name,
        address=address,
        postal_code='59290',
        city='Wasquehal',
        email=email,
        phone=phone,
        booking_date=booking_date,
        booking_time=booking_time,
        status=1,
        price=10.0
    )
    db.session.add(new_booking)
    db.session.flush()

    history = BookingHistory(
        booking_id=new_booking.id,
        actor='Client',
        action='Création de la réservation en ligne.'
    )
    db.session.add(history)
    session['fake_captcha_verified'] = False
    db.session.commit()

    log_security_event('BOOKING_CREATED', f"{first_name} {last_name}", f"Réservation {ref} pour le {booking_date} à {booking_time}", record_ip=False)

    return jsonify({
        'success': True,
        'reference': ref,
        'date': booking_date,
        'time': booking_time,
        'email': email
    })