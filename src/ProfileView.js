// @flow
import React, { Fragment } from 'react'
import MediaQuery from 'react-responsive'

import { capitalize } from './utils'
import NextButton from './NextButton'
import ProfileAvatar from './ProfileAvatar'

const Buttons = ({
  ownProfile,
  firstTimePublish,
  editing,
}: {
  ownProfile: boolean,
  firstTimePublish: boolean,
  editing: boolean,
}) => (
  <Fragment>
    {ownProfile && <NextButton to="/edit-profile" text="Edit profile" />}
    {!firstTimePublish &&
      !editing && <NextButton to="/browse" text="Back to list" />}
  </Fragment>
)

const ExpectationDisplay = ({
  name,
  value,
}: {
  name: string,
  value: boolean,
}) => {
  const id = name.split().join('-')

  return (
    <div className="expectation">
      <label for={id} className={!value ? 'grayed-out' : ''}>
        <input id={id} type="checkbox" disabled checked={value} />
        {name}
      </label>
    </div>
  )
}

type ProfileData = {|
  id: string,
  name: string,
  contactEmail: string,
  imageUrl: ?string,

  affiliations: Array<string>,
  clinicalSpecialties: Array<string>,
  professionalInterests: Array<string>,
  partsOfMe: Array<string>,
  activities: Array<string>,

  additionalInformation: string,

  willingShadowing: boolean,
  willingNetworking: boolean,
  willingGoalSetting: boolean,
  willingDiscussPersonal: boolean,
  willingCareerGuidance: boolean,
  willingStudentGroup: boolean,

  cadence: string,
  otherCadence: ?string,
|}

const Expectations = (data: ProfileData) => (
  <Fragment>
    <h4>I am available to help in the following ways:</h4>

    <ExpectationDisplay
      name="Clinical shadowing opportunities"
      value={data.willingShadowing}
    />

    <ExpectationDisplay name="Networking" value={data.willingNetworking} />

    <ExpectationDisplay name="Goal setting" value={data.willingGoalSetting} />

    <ExpectationDisplay
      name="Discussing personal as well as professional life"
      value={data.willingDiscussPersonal}
    />

    <ExpectationDisplay
      name="Career guidance"
      value={data.willingCareerGuidance}
    />
    <ExpectationDisplay
      name="Student interest group support or speaking at student events"
      value={data.willingStudentGroup}
    />
  </Fragment>
)

const Cadence = ({
  cadence,
  otherCadence,
}: {
  cadence: string,
  otherCadence: string,
}) => (
  <div style={{ marginTop: '1.2em' }}>
    <h4>Meeting Cadence</h4>
    {cadence === 'other' ? otherCadence : capitalize(cadence)}
  </div>
)

const HospitalAffiliations = ({ affiliations }) => (
  <Fragment>
    <h4 style={{ marginTop: '2em' }}>Hospital Affiliations</h4>
    <p style={{ paddingBottom: '1em' }}>{affiliations}</p>
  </Fragment>
)

const ClinicalInterests = ({ interests }) => (
  <div>
    <h4>Clinical Interests</h4>
    <p style={{ paddingBottom: '1em' }}>{interests}</p>
  </div>
)

const AboutInfo = data => (
  <Fragment>
    <HospitalAffiliations affiliations={data.affiliations.join(', ')} />

    {data.clinicalSpecialties.length > 0 && (
      <ClinicalInterests interests={data.clinicalSpecialties.join(', ')} />
    )}

    {data.professionalInterests.length > 0 && (
      <div>
        <h4>Professional Interests</h4>
        <p style={{ paddingBottom: '1em' }}>
          {data.professionalInterests.join(', ')}
        </p>
      </div>
    )}

    {data.partsOfMe.length > 0 && (
      <div>
        <h4>Parts Of Me</h4>
        <p style={{ paddingBottom: '1em' }}>{data.partsOfMe.join(', ')}</p>
      </div>
    )}

    {data.activities.length > 0 && (
      <div>
        <h4>Activities I Enjoy</h4>
        <p style={{ paddingBottom: '1em' }}>{data.activities.join(', ')}</p>
      </div>
    )}

    {data.additionalInformation && (
      <div>
        <h4>Additional Information</h4>
        <p>{data.additionalInformation}</p>
      </div>
    )}
  </Fragment>
)

const ContactInformation = data => (
  <Fragment>
    <h4>Contact Information</h4>

    <a className="contact-email" href={`mailto:${data.contactEmail}`}>
      {data.contactEmail}
    </a>
  </Fragment>
)

const ProfileView = ({
  data,
  ownProfile,
  firstTimePublish,
  editing,
}: {
  data: ProfileData,
  ownProfile: boolean,
  firstTimePublish: boolean,
  editing: boolean,
}) => (
  <Fragment>
    <MediaQuery query="(max-device-width: 750px)">
      <div className="profile-contact">
        <Buttons {...{ ownProfile, firstTimePublish, editing }} />

        <ProfileAvatar imageUrl={data.imageUrl} name={data.name} size={200} />

        <h1>{data.name}</h1>

        <ContactInformation {...data} />

        <Cadence cadence={data.cadence} otherCadence={data.otherCadence} />

        <Expectations {...data} />
        <AboutInfo {...data} />
      </div>
    </MediaQuery>

    <MediaQuery query="(min-device-width: 750px)">
      <div className="profile-contact">
        <div className="columns">
          <div className="column contact">
            <ProfileAvatar
              imageUrl={data.imageUrl}
              name={data.name}
              size={200}
            />

            <ContactInformation {...data} />

            <Cadence cadence={data.cadence} otherCadence={data.otherCadence} />

            <Expectations {...data} />
          </div>
          <div className="about">
            <Buttons {...{ ownProfile, firstTimePublish, editing }} />

            <h1>{data.name}</h1>

            <AboutInfo {...data} />
          </div>
        </div>
      </div>
    </MediaQuery>
  </Fragment>
)

export default ProfileView
