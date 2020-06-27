from server.models import db


def flat_values(values):
    return [tup[0] for tup in values]


def save_tags(profile, tag_values, option_class, profile_relation_class):
    activity_values = [value["tag"]["value"].strip() for value in tag_values]

    existing_activity_options = option_class.query.filter(
        option_class.value.in_(activity_values)
    )

    existing_activity_values = flat_values(
        existing_activity_options.values(option_class.value)
    )

    new_activity_values = [
        value for value in activity_values if value not in existing_activity_values
    ]

    new_activities = [option_class(value=value) for value in new_activity_values]

    db.session.add_all(new_activities)
    db.session.commit()

    existing_profile_relation_tag_ids = flat_values(
        profile_relation_class.query.filter(
            profile_relation_class.tag_id.in_(
                flat_values(existing_activity_options.values(profile_relation_class.id))
            ),
            profile_relation_class.profile_id == profile.id,
        ).values(profile_relation_class.tag_id)
    )

    new_profile_relations = [
        profile_relation_class(tag_id=activity.id, profile_id=profile.id)
        for activity in existing_activity_options  # All activities exist by this point
        if activity.id not in existing_profile_relation_tag_ids
    ]

    db.session.add_all(new_profile_relations)
    db.session.commit()
