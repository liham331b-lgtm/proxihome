from flask import Blueprint, render_template, request, flash, redirect, url_for, current_app
from app import db
from app.models import Booking, ContactMessage

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    return render_template('index.html')

@main_bp.route('/informations')
def informations():
    return render_template('pages.html', page='informations')

@main_bp.route('/services')
def services():
    return render_template('pages.html', page='services')

@main_bp.route('/mentions-legales')
def legal():
    return render_template('pages.html', page='legal')

@main_bp.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        subject = request.form.get('subject', '').strip()
        message = request.form.get('message', '').strip()

        if not all([name, email, subject, message]):
            flash("Veuillez remplir tous les champs du formulaire.", "error")
        else:
            msg = ContactMessage(name=name, email=email, subject=subject, message=message)
            db.session.add(msg)
            db.session.commit()
            flash("Votre message a bien été envoyé à notre équipe de Wasquehal !", "success")
            return redirect(url_for('main.contact'))

    return render_template('pages.html', page='contact', contact_email=current_app.config['CONTACT_EMAIL'])

@main_bp.route('/suivi', methods=['GET', 'POST'])
def tracking():
    booking = None
    error = None
    ref = request.args.get('ref', '').strip().upper()

    if request.method == 'POST':
        ref = request.form.get('reference', '').strip().upper()
        email = request.form.get('email', '').strip().lower()
        booking = Booking.query.filter_by(reference=ref).first()

        if not booking or booking.email.lower() != email:
            error = "Aucune intervention trouvée avec cette référence et cette adresse e-mail."
            booking = None

    return render_template('tracking.html', booking=booking, error=error, prefill_ref=ref)