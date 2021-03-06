from server.models import ProfileStar, save
from server.queries import matching_faculty_profiles

from .utils import create_test_profile, create_test_verification_email


def test_matching_profiles_starred_profile(db_session):
    user_email = create_test_verification_email()

    other_profile = create_test_profile(available_for_mentoring=True)

    profiles = matching_faculty_profiles(
        query="",
        tags="",
        degrees="",
        affiliations="",
        verification_email_id=user_email.id,
    )

    save(
        ProfileStar(
            from_verification_email_id=user_email.id,
            to_verification_email_id=other_profile.verification_email_id,
        )
    )

    profile, starred = profiles[0]

    assert profile.id == other_profile.id
    assert starred


def test_matching_profiles(db_session):
    user_email = create_test_verification_email()

    profile = create_test_profile(available_for_mentoring=True)

    # TODO pluralized arguments to matching_faculty_profiles should be
    # arrays; query should be Optional[str]
    profiles = matching_faculty_profiles(
        query="",
        tags="",
        degrees="",
        affiliations="",
        verification_email_id=user_email.id,
    )

    profile_result, starred = profiles[0]
    assert profile_result.id == profile.id


def test_matching_profiles_empty(db_session):
    user_email = create_test_verification_email()

    profiles = matching_faculty_profiles(
        query="",
        tags="",
        degrees="",
        affiliations="",
        verification_email_id=user_email.id,
    )

    assert list(profiles) == []
