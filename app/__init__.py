from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash
from config import Config

db = SQLAlchemy()
login_manager = LoginManager()
csrf = CSRFProtect()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    migrate.init_app(app, db)

    login_manager.login_view = 'admin.login'
    login_manager.login_message = "Veuillez vous connecter pour accéder à l'espace administrateur."

    from app.routes.main import main_bp
    from app.routes.booking import booking_bp
    from app.routes.admin import admin_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(booking_bp)
    app.register_blueprint(admin_bp, url_prefix='/admin')

    with app.app_context():
        from app import models
        db.create_all()
        init_defaults(app)

    return app

def init_defaults(app):
    from app.models import AdminUser, AvailabilityConfig
    # Création de l'administrateur par défaut s'il n'existe pas
    if not AdminUser.query.filter_by(username=app.config['ADMIN_USERNAME']).first():
        admin = AdminUser(
            username=app.config['ADMIN_USERNAME'],
            password_hash=generate_password_hash(app.config['ADMIN_PASSWORD'])
        )
        db.session.add(admin)

    # Configuration des disponibilités par défaut
    if not AvailabilityConfig.query.first():
        default_config = AvailabilityConfig(
            working_days="0,1,2,3,4,5",  # Lundi à Samedi
            time_slots="09:00,10:00,11:00,14:00,15:00,16:00,17:00",
            max_per_slot=1,
            blocked_dates=""
        )
        db.session.add(default_config)

    db.session.commit()