from datetime import datetime
from flask_login import UserMixin
from app import db, login_manager

@login_manager.user_loader
def load_user(user_id):
    return AdminUser.query.get(int(user_id))

class AdminUser(UserMixin, db.Model):
    __tablename__ = 'admin_users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

class Booking(db.Model):
    __tablename__ = 'bookings'
    id = db.Column(db.Integer, primary_key=True)
    reference = db.Column(db.String(20), unique=True, nullable=False, index=True)
    
    # Informations client
    last_name = db.Column(db.String(100), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    postal_code = db.Column(db.String(10), nullable=False, default='59290')
    city = db.Column(db.String(50), nullable=False, default='Wasquehal')
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=False)

    # Créneau
    booking_date = db.Column(db.String(10), nullable=False)  # YYYY-MM-DD
    booking_time = db.Column(db.String(5), nullable=False)   # HH:MM

    # Statut & Finance
    # 1: PRISE EN COMPTE | 2: EN PRÉPARATION | 3: EN DÉPLACEMENT | 4: TERMINÉE | 0: ANNULÉE
    status = db.Column(db.Integer, default=1, nullable=False)
    price = db.Column(db.Float, default=10.0, nullable=False)
    payment_method = db.Column(db.String(50), default='Espèces sur place', nullable=False)
    payment_received = db.Column(db.Boolean, default=False, nullable=False)
    internal_notes = db.Column(db.Text, default='')

    # Horodatages des étapes
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    step1_at = db.Column(db.DateTime, default=datetime.utcnow)
    step2_at = db.Column(db.DateTime, nullable=True)
    step3_at = db.Column(db.DateTime, nullable=True)
    step4_at = db.Column(db.DateTime, nullable=True)

    history = db.relationship('BookingHistory', backref='booking', lazy=True, cascade="all, delete-orphan")

    @property
    def status_label(self):
        labels = {
            0: "Annulée",
            1: "Demande prise en compte",
            2: "Préparation de l'intervention",
            3: "Équipe en déplacement",
            4: "Intervention terminée"
        }
        return labels.get(self.status, "Inconnu")

class BookingHistory(db.Model):
    __tablename__ = 'booking_history'
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    actor = db.Column(db.String(64), nullable=False)
    action = db.Column(db.String(255), nullable=False)

class AvailabilityConfig(db.Model):
    __tablename__ = 'availability_config'
    id = db.Column(db.Integer, primary_key=True)
    working_days = db.Column(db.String(50), default="0,1,2,3,4,5")
    time_slots = db.Column(db.String(255), default="09:00,10:00,11:00,14:00,15:00,16:00,17:00")
    max_per_slot = db.Column(db.Integer, default=1)
    blocked_dates = db.Column(db.Text, default="")  # Séparées par des virgules YYYY-MM-DD

class SecurityLog(db.Model):
    __tablename__ = 'security_logs'
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    event_type = db.Column(db.String(50), nullable=False)
    actor = db.Column(db.String(64), nullable=False)
    details = db.Column(db.String(255), nullable=False)
    ip_address = db.Column(db.String(45), nullable=True)

class ContactMessage(db.Model):
    __tablename__ = 'contact_messages'
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    subject = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)