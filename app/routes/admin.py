from datetime import datetime, date
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
from app import db
from app.models import AdminUser, Booking, BookingHistory, AvailabilityConfig, SecurityLog
from app.utils import log_security_event

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('admin.dashboard'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        user = AdminUser.query.filter_by(username=username).first()

        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            log_security_event('ADMIN_LOGIN_SUCCESS', username, 'Connexion administrateur réussie.')
            return redirect(url_for('admin.dashboard'))
        else:
            log_security_event('ADMIN_LOGIN_FAILED', username or 'Inconnu', 'Tentative de connexion échouée.')
            flash("Identifiants incorrects.", "error")

    return render_template('admin/login.html')

@admin_bp.route('/logout')
@login_required
def logout():
    log_security_event('ADMIN_LOGOUT', current_user.username, 'Déconnexion administrateur.')
    logout_user()
    return redirect(url_for('main.index'))

@admin_bp.route('/')
@login_required
def dashboard():
    bookings = Booking.query.order_by(Booking.created_at.desc()).all()
    today_str = date.today().strftime('%Y-%m-%d')

    stats = {
        'total': len(bookings),
        'pending': sum(1 for b in bookings if b.status == 1),
        'preparing': sum(1 for b in bookings if b.status == 2),
        'moving': sum(1 for b in bookings if b.status == 3),
        'completed': sum(1 for b in bookings if b.status == 4),
        'revenue': sum(b.price for b in bookings if b.status == 4 and b.payment_received),
        'today': sum(1 for b in bookings if b.booking_date == today_str and b.status != 0)
    }

    config = AvailabilityConfig.query.first()
    logs = SecurityLog.query.order_by(SecurityLog.timestamp.desc()).limit(30).all()

    return render_template(
        'admin/dashboard.html',
        bookings=bookings,
        stats=stats,
        config=config,
        logs=logs
    )

@admin_bp.route('/commande/<int:booking_id>', methods=['GET', 'POST'])
@login_required
def order_detail(booking_id):
    booking = Booking.query.get_or_404(booking_id)

    if request.method == 'POST':
        action_type = request.form.get('action_type')

        if action_type == 'delete':
            ref = booking.reference
            db.session.delete(booking)
            db.session.commit()
            log_security_event('BOOKING_DELETED', current_user.username, f"Suppression définitive de {ref}")
            flash(f"La commande {ref} a été supprimée.", "success")
            return redirect(url_for('admin.dashboard'))

        new_status = int(request.form.get('status', booking.status))
        new_date = request.form.get('booking_date', booking.booking_date)
        new_time = request.form.get('booking_time', booking.booking_time)
        payment_received = request.form.get('payment_received') == 'on'
        notes = request.form.get('internal_notes', '')

        changes = []
        if new_status != booking.status:
            booking.status = new_status
            now = datetime.utcnow()
            if new_status == 2:
                booking.step2_at = now
            elif new_status == 3:
                booking.step3_at = now
            elif new_status == 4:
                booking.step4_at = now
            changes.append(f"Statut -> {booking.status_label}")

        if new_date != booking.booking_date or new_time != booking.booking_time:
            booking.booking_date = new_date
            booking.booking_time = new_time
            changes.append(f"Créneau -> {new_date} à {new_time}")

        if payment_received != booking.payment_received:
            booking.payment_received = payment_received
            changes.append(f"Paiement espèces -> {'Reçu' if payment_received else 'En attente'}")

        if notes != booking.internal_notes:
            booking.internal_notes = notes
            changes.append("Mise à jour des notes internes")

        if changes:
            desc = " | ".join(changes)
            db.session.add(BookingHistory(
                booking_id=booking.id,
                actor=current_user.username,
                action=desc
            ))
            log_security_event('BOOKING_UPDATED', current_user.username, f"{booking.reference}: {desc}")
            db.session.commit()
            flash("Modifications enregistrées et suivi client actualisé.", "success")

        return redirect(url_for('admin.order_detail', booking_id=booking.id))

    return render_template('admin/order_detail.html', booking=booking)

@admin_bp.route('/disponibilites', methods=['POST'])
@login_required
def update_availability():
    config = AvailabilityConfig.query.first()
    days = request.form.getlist('working_days')
    config.working_days = ",".join(days)
    config.time_slots = request.form.get('time_slots', '').strip()
    config.max_per_slot = int(request.form.get('max_per_slot', 1))
    config.blocked_dates = request.form.get('blocked_dates', '').strip()

    db.session.commit()
    log_security_event('CONFIG_UPDATED', current_user.username, "Mise à jour des disponibilités et créneaux.")
    flash("Paramètres de disponibilité mis à jour.", "success")
    return redirect(url_for('admin.dashboard'))