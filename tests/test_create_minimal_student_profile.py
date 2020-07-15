import http
import datetime

from freezegun import freeze_time

from .utils import create_test_verification_token

MOCK_DATE = datetime.datetime(2020, 7, 15, tzinfo=datetime.timezone.utc)


@freeze_time(MOCK_DATE)
def test_create_minimal_student_profile(client, auth):
    token = create_test_verification_token(is_mentor=False)

    auth.login(token.token)

    name = "Student"
    email = "student@student.com"

    cadence = "monthly"

    profile = {
        "name": name,
        "contact_email": email,
        "program": None,
        "current_year": None,
        "pce_site": None,
        "clinical_specialties": [],
        "activities": [],
        "affiliations": [],
        "professional_interests": [],
        "parts_of_me": [],
        "cadence": cadence,
    }

    response = client.post("/api/student-profile", json=profile)

    assert response.status_code == http.HTTPStatus.CREATED.value, response.json
