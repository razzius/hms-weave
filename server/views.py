import datetime
import uuid
from http import HTTPStatus

from dateutil.relativedelta import relativedelta
from flask import Blueprint, jsonify, request

from cloudinary import uploader
from marshmallow import Schema, ValidationError, fields, validates_schema
from requests_toolbelt.utils import dump
from sqlalchemy import func, or_
from sqlalchemy.sql import exists

from .emails import (
    send_faculty_login_email,
    send_faculty_registration_email,
    send_student_login_email,
    send_student_registration_email
)
from .models import (
    Activity,
    Profile,
    ProfileActivity,
    VerificationEmail,
    VerificationToken,
    db,
    get_verification_email_by_email,
    save
)


api = Blueprint('api', __name__)


class RenderedList(fields.List):
    def _serialize(self, value, attr, obj):
        if value is None:
            return []
        return super()._serialize(value, attr, obj)

    def _deserialize(self, value, attr, data):
        if value is None:
            return ''
        return super()._deserialize(value, attr, data)


class ActivitySchema(Schema):
    value = fields.String()


class ProfileActivitySchema(Schema):
    activity = fields.Nested(ActivitySchema, only='value')


class ProfileSchema(Schema):
    id = fields.String(dump_only=True)
    name = fields.String()
    contact_email = fields.String()
    profile_image_url = fields.String(allow_none=True)

    affiliations = RenderedList(fields.String)
    clinical_specialties = RenderedList(fields.String)
    professional_interests = RenderedList(fields.String)
    parts_of_me = RenderedList(fields.String)
    activities = fields.Nested(ProfileActivitySchema, only='activity', many=True)

    additional_information = fields.String()

    willing_shadowing = fields.Boolean()
    willing_networking = fields.Boolean()
    willing_goal_setting = fields.Boolean()
    willing_discuss_personal = fields.Boolean()
    willing_career_guidance = fields.Boolean()
    willing_student_group = fields.Boolean()

    cadence = fields.String()
    other_cadence = fields.String(allow_none=True)


VALID_DOMAINS = {'harvard.edu', 'partners.org', 'hmsweave.com'}


class ValidEmailSchema(Schema):
    email = fields.String(required=True)

    @validates_schema
    def validate_email(self, in_data):
        email = in_data.get('email', '')

        if not any(email.endswith(domain) for domain in VALID_DOMAINS):
            raise ValidationError(
                'Email must end with harvard.edu or partners.org', 'email'
            )


profile_schema = ProfileSchema()
profiles_schema = ProfileSchema(many=True)
valid_email_schema = ValidEmailSchema()


@api.errorhandler(ValidationError)
def handle_invalid_schema(error):
    return {'hi': 'there'}


def matching_profiles(query):
    if query is None:
        return Profile.query.filter(Profile.available_for_mentoring)

    words = query.lower().split()

    searchable_fields = [
        Profile.name,
        Profile.additional_information,
        Profile.clinical_specialties,
        Profile.professional_interests,
        Profile.affiliations,
        Profile.activities,
        Profile.parts_of_me,
        Profile.cadence,
    ]

    search_filters = [
        or_(*[func.lower(field).contains(word) for field in searchable_fields])
        for word in words
    ]

    filters = [Profile.available_for_mentoring, *search_filters]

    return Profile.query.filter(*filters)


def get_token(headers):
    token = request.headers.get('Authorization')

    if token is None:
        return (
            error(
                {'token': ['unauthorized']}, status_code=HTTPStatus.UNAUTHORIZED.value
            ),
            None,
        )

    token_parts = token.split()

    if token_parts[0].lower() != 'token' or len(token_parts) != 2:
        return (
            error({'token': ['bad format']}, status_code=HTTPStatus.UNAUTHORIZED.value),
            None,
        )

    token_value = token_parts[1]

    verification_token = VerificationToken.query.get(token_value)

    if verification_token is None:
        return (
            error(
                {'token': ['unknown token']}, status_code=HTTPStatus.UNAUTHORIZED.value
            ),
            None,
        )

    if _token_expired(verification_token):
        return (
            error({'token': ['expired']}, status_code=HTTPStatus.UNAUTHORIZED.value),
            None,
        )

    return None, verification_token


@api.route('/api/profiles')
def get_profiles():
    error, _ = get_token(request.headers)

    if error:
        return error

    query = request.args.get('query')

    return jsonify(profiles_schema.dump(matching_profiles(query)))


@api.route('/api/profiles/<profile_id>')
def get_profile(profile_id=None):
    return jsonify(
        profile_schema.dump(
            Profile.query.filter(Profile.id == profile_id).one_or_none()
        )
    )


def error(reason, status_code=HTTPStatus.BAD_REQUEST.value):
    return jsonify(reason), status_code


def api_post(route):
    return api.route(f'/api/{route}', methods=['POST'])


def save_activities(profile, schema_activities):
    activity_values = [value['activity']['value'] for value in schema_activities]

    existing_activities = Activity.query.filter(Activity.value.in_(activity_values))

    existing_activity_values = [
        tup[0] for tup in existing_activities.values('value')
    ]

    new_activity_values = [
        value for value in activity_values if value not in existing_activity_values
    ]

    new_activities = [Activity(value=value) for value in new_activity_values]

    db.session.add_all(new_activities)
    db.session.commit()

    profile_activities = [
        ProfileActivity(activity_id=activity.id, profile_id=profile.id)
        for activity in existing_activities  # All activities exist by this point
    ]

    db.session.add_all(profile_activities)
    db.session.commit()


def basic_profile_data(verification_token, schema):
    return {
        'verification_email_id': verification_token.email_id,
        **{
            key: value
            for key, value in schema.items()
            if key not in {
                # 'affiliations',
                # 'clinical_specialties',
                # 'professional_interests',
                # 'parts_of_me',
                'activities',
            }
        }
    }


@api_post('profile')
def create_profile(profile_id=None):
    error, verification_token = get_token(request.headers)

    if error:
        return error

    try:
        schema = profile_schema.load(request.json)
    except ValidationError as err:
        return jsonify(err.messages), 422

    if db.session.query(
        exists().where(Profile.contact_email == schema['contact_email'])
    ).scalar():
        return error({'email': ['This email already exists in the database']})

    profile_data = basic_profile_data(verification_token, schema)

    profile = Profile(**profile_data)

    save(profile)

    save_activities(profile, schema['activities'])

    return jsonify(profile_schema.dump(profile)), 201


@api.route('/api/profiles/<profile_id>', methods=['PUT'])
def update_profile(profile_id=None):
    try:
        schema = profile_schema.load(request.json)
    except ValidationError as err:
        return jsonify(err.messages), 422

    profile = Profile.query.get(profile_id)

    error, verification_token = get_token(request.headers)

    if error:
        return error  # TODO exceptions

    assert profile.verification_email_id == verification_token.email_id

    profile_data = basic_profile_data(verification_token, schema)

    for key, value in profile_data.items():
        setattr(profile, key, value)

    save(profile)

    # TODO delete activities that are no longer associated
    # lazy approach for now
    ProfileActivity.query.filter(ProfileActivity.profile_id == profile.id).delete()
    # TODO delete dangling activities
    save_activities(profile, schema['activities'])

    return jsonify(profile_schema.dump(profile))


def generate_token():
    return str(uuid.uuid4())


@api_post('upload-image')
def upload_image():
    data = request.data

    if not data:
        return error({'file': ['No image sent']})

    response = uploader.upload(
        data, eager=[{'width': 200, 'height': 200, 'crop': 'crop'}]
    )

    return jsonify({'image_url': response['eager'][0]['secure_url']})


def get_verification_email(email: str, is_mentor: bool) -> VerificationEmail:
    email = request.json['email']

    existing_email = get_verification_email_by_email(email)

    if existing_email:
        return existing_email, False

    verification_email = VerificationEmail(email=email, is_mentor=is_mentor)

    save(verification_email)

    return verification_email, True


def save_verification_token(email_id, token):
    verification_token = VerificationToken(email_id=email_id, token=token)

    save(verification_token)

    return verification_token


def send_token(verification_email, email_function):
    VerificationToken.query.filter(
        VerificationToken.email_id == verification_email.id
    ).update({VerificationToken.expired: True})

    token = generate_token()

    verification_token = save_verification_token(verification_email.id, token)

    email_response = email_function(verification_email.email, token)

    email_log = dump.dump_all(email_response).decode('utf-8')

    verification_token.email_log = email_log

    return save(verification_token)


def process_send_verification_email(is_mentor):
    email_function = (
        send_faculty_registration_email
        if is_mentor
        else send_student_registration_email
    )

    try:
        schema = valid_email_schema.load(request.json)
    except ValidationError as err:
        return error(err.messages)

    email = schema['email']

    existing_email = get_verification_email_by_email(email)

    if existing_email:
        return error({'email': ['claimed']})

    verification_email, _ = get_verification_email(email, is_mentor=is_mentor)

    send_token(verification_email, email_function=email_function)

    return jsonify({'id': verification_email.id, 'email': email})


@api_post('send-faculty-verification-email')
def send_faculty_verification_email():
    return process_send_verification_email(is_mentor=True)


@api_post('send-student-verification-email')
def send_student_verification_email():
    return process_send_verification_email(is_mentor=False)


@api_post('login')
def login():
    schema = valid_email_schema.load(request.json)

    if 'errors' in schema:
        return error(schema.errors)

    email = schema['email']

    verification_email = VerificationEmail.query.filter(
        VerificationEmail.email == email
    ).one_or_none()

    if verification_email is None:
        return error({'email': ['unregistered']})

    email_function = (
        send_faculty_login_email
        if verification_email.is_mentor
        else send_student_login_email
    )

    send_token(verification_email, email_function=email_function)

    return jsonify({'email': email})


def _token_expired(verification_token):
    expire_time = verification_token.date_created + relativedelta(
        hours=TOKEN_EXPIRY_AGE_HOURS
    )

    return verification_token.expired or datetime.datetime.now() > expire_time


TOKEN_EXPIRY_AGE_HOURS = 1


@api_post('verify-token')
def verify_token():
    token = request.json['token']

    query = VerificationToken.query.filter(VerificationToken.token == token)

    match = query.one_or_none()

    if match is None:
        return error({'token': ['not recognized']})

    if _token_expired(match):
        return error({'token': ['expired']})

    match.verified = True

    save(match)

    verification_email = VerificationEmail.query.get(match.email_id)

    profile = get_profile_by_token(token)

    profile_id = profile.id if profile is not None else None

    available_for_mentoring = (
        profile.available_for_mentoring if profile is not None else None
    )

    return jsonify(
        {
            'email': verification_email.email,
            'is_mentor': verification_email.is_mentor,
            'profile_id': profile_id,
            'available_for_mentoring': available_for_mentoring,
        }
    )


def get_profile_by_token(token):
    verification_token = VerificationToken.query.get(token)

    if verification_token is None:
        return None

    verification_email = VerificationEmail.query.get(verification_token.email_id)

    return Profile.query.filter(
        Profile.verification_email_id == verification_email.id
    ).one_or_none()


@api_post('availability')
def availability():
    error, verification_token = get_token(request.headers)

    if error is not None:
        return error

    available = request.json['available']

    profile = get_profile_by_token(verification_token.token)

    profile.available_for_mentoring = available

    save(profile)

    return jsonify({'available': available})