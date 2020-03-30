from server.models import ProfileStar, save
from server.queries import matching_profiles

from .utils import create_test_profile, create_test_verification_email


def test_matching_profiles_starred_profile(db_session):
    user_email = create_test_verification_email()

    other_profile = create_test_profile(available_for_mentoring=True)

    profiles = matching_profiles(
        query='', tags='', degrees='', affiliations='', verification_email=user_email
    )

    save(
        ProfileStar(
            from_verification_email_id=user_email.id, to_profile_id=other_profile.id
        )
    )

    profile = profiles[0]

    assert profile.id == other_profile.id
    assert profile.starred


def test_matching_profiles(db_session):
    user_email = create_test_verification_email()

    profile = create_test_profile(available_for_mentoring=True)

    # TODO pluralized arguments to matching_profiles should be arrays; query should be Optional[str]
    profiles = matching_profiles(
        query='', tags='', degrees='', affiliations='', verification_email=user_email
    )

    assert profiles[0].id == profile.id


def test_matching_profiles_empty(db_session):
    user_email = create_test_verification_email()

    profiles = matching_profiles(
        query='', tags='', degrees='', affiliations='', verification_email=user_email
    )

    assert list(profiles) == []
