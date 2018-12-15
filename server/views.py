import datetime
import uuid
from http import HTTPStatus

from dateutil.relativedelta import relativedelta
from flask import Blueprint, jsonify, request

from cloudinary import uploader
from sentry_sdk import capture_exception
from marshmallow import ValidationError
from requests_toolbelt.utils import dump
from sqlalchemy import func, or_
from sqlalchemy.sql import exists

from .emails import (
    send_faculty_login_email,
    send_faculty_registration_email,
    send_student_login_email,
    send_student_registration_email,
)
from .models import (
    ActivityOption,
    ClinicalSpecialty,
    ClinicalSpecialtyOption,
    HospitalAffiliation,
    HospitalAffiliationOption,
    PartsOfMe,
    PartsOfMeOption,
    ProfessionalInterest,
    ProfessionalInterestOption,
    Profile,
    ProfileActivity,
    VerificationEmail,
    VerificationToken,
    db,
    get_verification_email_by_email,
    save,
)
from .schemas import profile_schema, profiles_schema, valid_email_schema


api = Blueprint('api', __name__)


def matching_profiles(query):
    if query is None or query == '':
        return Profile.query.filter(Profile.available_for_mentoring)

    words = ''.join(
        character if character.isalnum() or character == ' ' else ' '
        for character in query.lower()
    ).split()

    searchable_fields = [Profile.name, Profile.additional_information, Profile.cadence]

    tag_fields = [
        (HospitalAffiliation, HospitalAffiliationOption),
        (ClinicalSpecialty, ClinicalSpecialtyOption),
        (ProfessionalInterest, ProfessionalInterestOption),
        (PartsOfMe, PartsOfMeOption),
        (ProfileActivity, ActivityOption),
    ]

    search_filters = [
        or_(
            *[func.lower(field).contains(word) for field in searchable_fields]
            + [
                func.lower(option_class.value).contains(word)
                for _, option_class in tag_fields
            ]
        )
        for word in words
    ]

    filters = [Profile.available_for_mentoring, *search_filters]

    query = Profile.query

    for relation, option_class in tag_fields:
        query = query.outerjoin(relation).outerjoin(option_class)

    return query.filter(*filters)


def get_token(headers):
    token = headers.get('Authorization')

    if token is None:
        return (
            error_response(
                {'token': ['unauthorized']}, status_code=HTTPStatus.UNAUTHORIZED.value
            ),
            None,
        )

    token_parts = token.split()

    if token_parts[0].lower() != 'token' or len(token_parts) != 2:
        return (
            error_response(
                {'token': ['bad format']}, status_code=HTTPStatus.UNAUTHORIZED.value
            ),
            None,
        )

    token_value = token_parts[1]

    verification_token = VerificationToken.query.get(token_value)

    if verification_token is None:
        return (
            error_response(
                {'token': ['unknown token']}, status_code=HTTPStatus.UNAUTHORIZED.value
            ),
            None,
        )

    if _token_expired(verification_token):
        return (
            error_response(
                {'token': ['expired']}, status_code=HTTPStatus.UNAUTHORIZED.value
            ),
            None,
        )

    return None, verification_token


def pagination(page):
    size = 20

    start = (page - 1) * size

    end = start + size

    return start, end


@api.route('/api/profiles')
def get_profiles():
    error, verification_token = get_token(request.headers)

    if error:
        return error

    query = request.args.get('query')

    page = int(request.args.get('page', 1))

    start, end = pagination(page)

    verification_email_id = VerificationToken.query.filter(
        VerificationToken.token == verification_token.token
    ).value(VerificationToken.email_id)

    queryset = matching_profiles(query).order_by(
        # Is this the logged-in user's profile? If so, return it first (false)
        Profile.verification_email_id != verification_email_id,
        # Get the last word in the name.
        # Won't work with suffixes.
        func.split_part(
            Profile.name,
            ' ',
            func.array_length(
                func.string_to_array(
                    func.regexp_replace(
                        Profile.name, '(,|MD).*', ''
                    ),  # Remove suffixes after comma and MD
                    ' ',
                ),
                1,  # How many words in the name
            ),
        ),
    )

    return jsonify(
        {
            'profileCount': queryset.count(),
            'profiles': profiles_schema.dump(queryset[start:end]),
        }
    )


@api.route('/api/profiles/<profile_id>')
def get_profile(profile_id=None):
    profile = Profile.query.filter(Profile.id == profile_id).one_or_none()

    if profile is None:
        return error_response({'profile_id': ['Not found']}, 404)

    return jsonify(
        profile_schema.dump(Profile.query.filter(Profile.id == profile_id).one())
    )


def error_response(reason, status_code=HTTPStatus.BAD_REQUEST.value):
    return jsonify(reason), status_code


def api_post(route):
    return api.route(f'/api/{route}', methods=['POST'])


def flat_values(values):
    return [tup[0] for tup in values]


def save_tags(profile, tag_values, option_class, profile_relation_class):
    activity_values = [value['tag']['value'] for value in tag_values]

    existing_activity_options = option_class.query.filter(
        option_class.value.in_(activity_values)
    )

    existing_activity_values = flat_values(existing_activity_options.values('value'))

    new_activity_values = [
        value for value in activity_values if value not in existing_activity_values
    ]

    new_activities = [option_class(value=value) for value in new_activity_values]

    db.session.add_all(new_activities)
    db.session.commit()

    existing_profile_relation_tag_ids = flat_values(
        profile_relation_class.query.filter(
            profile_relation_class.tag_id.in_(
                flat_values(existing_activity_options.values('id'))
            ),
            profile_relation_class.profile_id == profile.id,
        ).values('tag_id')
    )

    profile_relations = [
        profile_relation_class(tag_id=activity.id, profile_id=profile.id)
        for activity in existing_activity_options  # All activities exist by this point
        if activity.id not in existing_profile_relation_tag_ids
    ]

    db.session.add_all(profile_relations)
    db.session.commit()


def save_all_tags(profile, schema):
    save_tags(
        profile, schema['affiliations'], HospitalAffiliationOption, HospitalAffiliation
    )
    save_tags(
        profile,
        schema['clinical_specialties'],
        ClinicalSpecialtyOption,
        ClinicalSpecialty,
    )
    save_tags(
        profile,
        schema['professional_interests'],
        ProfessionalInterestOption,
        ProfessionalInterest,
    )
    save_tags(profile, schema['parts_of_me'], PartsOfMeOption, PartsOfMe)
    save_tags(profile, schema['activities'], ActivityOption, ProfileActivity)


def basic_profile_data(verification_token, schema):
    return {
        'verification_email_id': verification_token.email_id,
        **{
            key: value
            for key, value in schema.items()
            if key
            not in {
                'affiliations',
                'clinical_specialties',
                'professional_interests',
                'parts_of_me',
                'activities',
            }
        },
    }


@api_post('profile')
def create_profile():
    error, verification_token = get_token(request.headers)

    if error:
        return error

    try:
        schema = profile_schema.load(request.json)
    except ValidationError as err:
        capture_exception(err)
        return jsonify(err.messages), 422

    if db.session.query(
        exists().where(Profile.contact_email == schema['contact_email'])
    ).scalar():
        return error_response({'email': ['This email already exists in the database']})

    profile_data = basic_profile_data(verification_token, schema)

    profile = Profile(**profile_data)

    db.session.add(profile)

    save_all_tags(profile, schema)

    return jsonify(profile_schema.dump(profile)), 201


@api.route('/api/profiles/<profile_id>', methods=['PUT'])
def update_profile(profile_id=None):
    try:
        schema = profile_schema.load(request.json)
    except ValidationError as err:
        capture_exception(err)
        return jsonify(err.messages), 422

    profile = Profile.query.get(profile_id)

    error, verification_token = get_token(request.headers)

    if error:
        return error  # TODO exceptions

    assert profile.verification_email_id == verification_token.email_id

    profile_data = basic_profile_data(verification_token, schema)

    for key, value in profile_data.items():

        # TODO put this with the schema
        if key in {'name', 'contact_email'}:
            setattr(profile, key, value.strip())
        else:
            setattr(profile, key, value)

    save(profile)

    # TODO rather than deleting all, delete only ones that haven't changed
    profile_relation_classes = {
        ProfessionalInterest,
        ProfileActivity,
        HospitalAffiliation,
        PartsOfMe,
        ClinicalSpecialty,
    }
    for profile_relation_class in profile_relation_classes:
        profile_relation_class.query.filter(
            profile_relation_class.profile_id == profile.id
        ).delete()

    save_all_tags(profile, schema)

    return jsonify(profile_schema.dump(profile))


def generate_token():
    return str(uuid.uuid4())


@api_post('upload-image')
def upload_image():
    data = request.data

    if not data:
        return error_response({'file': ['No image sent']})

    response = uploader.upload(
        data, eager=[{'width': 200, 'height': 200, 'crop': 'crop'}]
    )

    return jsonify({'image_url': response['eager'][0]['secure_url']})


def get_verification_email(email: str, is_mentor: bool) -> VerificationEmail:
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
        capture_exception(err)
        return error_response(err.messages)

    email = schema['email'].lower()

    existing_email = get_verification_email_by_email(email)

    if existing_email:
        return error_response({'email': ['claimed']})

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
        return error_response(schema.errors)

    email = schema['email'].lower()

    verification_email = VerificationEmail.query.filter(
        VerificationEmail.email == email
    ).one_or_none()

    if verification_email is None:
        return error_response({'email': ['unregistered']})

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

    return verification_token.expired or datetime.datetime.utcnow() > expire_time


TOKEN_EXPIRY_AGE_HOURS = 1


@api_post('verify-token')
def verify_token():
    token = request.json['token']

    query = VerificationToken.query.filter(VerificationToken.token == token)

    match = query.one_or_none()

    if match is None:
        return error_response({'token': ['not recognized']})

    if _token_expired(match):
        return error_response(
            {'token': ['expired']}, status_code=HTTPStatus.UNAUTHORIZED.value
        )

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
