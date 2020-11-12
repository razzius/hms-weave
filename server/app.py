import os
import uuid

from flask import Flask, url_for, redirect, session
from flask_sslify import SSLify
from flask_saml2.sp import ServiceProvider
import flask_login

from flask_saml2.utils import certificate_from_string, private_key_from_string
from structlog import get_logger
from .admin import init_admin
from .emails import init_email
from .models import db
from .auth import login_manager
from .queries import get_verification_email_by_email
from . import views
from . import cli


log = get_logger()


class NoCacheIndexFlask(Flask):
    def get_send_file_max_age(self, name):
        if name.lower().endswith("index.html"):
            return 0
        return 31536000


class WeaveServiceProvider(ServiceProvider):
    def login_successful(self, auth_data, relay_state):
        # user_id = auth_data.nameid
        log.info("Got successful saml login", auth_data=auth_data)

        session["auth_data"] = auth_data

        email = auth_data.attributes["email"]

        token = str(uuid.uuid4())

        verification_email = get_verification_email_by_email(email)

        if verification_email is None:
            log.info('email not found', email=email)
            # would be good to know if they were faculty or not
            return """
                While harvardkey integration is in beta,
                you must sign up using email before signing in with harvardkey
            """

        verification_token = views.api.save_verification_token(
            verification_email.id, token, is_personal_device=False
        )

        flask_login.login_user(verification_token)

        return redirect("/")

    def logout(self):
        flask_login.logout_user()

        return redirect("/")

    def get_auth_data_in_session(self):
        return session["auth_data"]

    def is_user_logged_in(self):
        return flask_login.current_user.is_authenticated

    def get_logout_return_url(self):
        return url_for("home.index", _external=True)

    def get_default_login_return_url(self):
        return url_for("home.index", _external=True)


def create_app():
    app = NoCacheIndexFlask(
        "server", static_url_path="/static", static_folder="../build/static"
    )

    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL", "postgresql:///weave"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ECHO"] = bool(os.environ.get("SQLALCHEMY_ECHO"))
    app.config["BASIC_AUTH_USERNAME"] = os.environ.get("BASIC_AUTH_USERNAME")
    app.config["BASIC_AUTH_PASSWORD"] = os.environ.get("BASIC_AUTH_PASSWORD")
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY")

    app.config["TOKEN_EXPIRY_AGE_HOURS"] = int(
        os.environ.get("REACT_APP_TOKEN_EXPIRY_AGE_HOURS", 1)
    )

    db.init_app(app)
    login_manager.init_app(app)

    if not app.debug:
        app.config["SESSION_COOKIE_SAMESITE"] = "Strict"
        app.config["SESSION_COOKIE_SECURE"] = True
        SSLify(app)

    init_admin(app)
    init_email(app)

    app.register_blueprint(views.home)
    app.register_blueprint(views.api)
    app.register_blueprint(cli.blueprint)

    SP_CERTIFICATE = certificate_from_string(
        os.environ.get("SAML_SP_CERT").replace("|", "\n")
    )
    IDP_CERTIFICATE = certificate_from_string(
        os.environ.get("SAML_IDP_CERT").replace("|", "\n")
    )
    PRIVATE_KEY = private_key_from_string(
        os.environ.get("SAML_SP_KEY").replace("|", "\n")
    )

    app.config["SERVER_NAME"] = os.environ.get("WEAVE_SERVER_NAME")

    app.config["SAML2_SP"] = {
        "certificate": SP_CERTIFICATE,
        "private_key": PRIVATE_KEY,
    }

    app.config["SAML2_IDENTITY_PROVIDERS"] = [
        {
            "CLASS": "server.saml.X509IdPHandler",
            "OPTIONS": {
                # "display_name": "keycloak",
                "entity_id": os.environ.get("SAML_ENTITY_ID"),
                "sso_url": os.environ.get("SAML_SSO_URL"),
                # "slo_url": "http://localhost:8080/auth/realms/master/protocol/saml",
                "certificate": IDP_CERTIFICATE,
            },
        },
    ]

    sp = WeaveServiceProvider()
    app.register_blueprint(sp.create_blueprint(), url_prefix="/saml/")

    return app
