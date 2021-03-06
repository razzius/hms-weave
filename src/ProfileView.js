// @flow
import React, { Fragment, useState, type Node } from 'react'
import MediaQuery from 'react-responsive'
import { withRouter, type RouterHistory } from 'react-router-dom'
import ReactTooltip from 'react-tooltip'

import { starProfile, unstarProfile } from './api'
import Button from './Button'
import ProfileAvatar from './ProfileAvatar'
import ProfileStar from './ProfileStar'
import { CADENCE_LABELS } from './CadenceOption'

const Buttons = ({
  ownProfile,
  firstTimePublish,
  editing,
  location,
  adminButton,
  browseUrl,
  editUrl,
}: {
  ownProfile: boolean,
  firstTimePublish: boolean,
  editing: boolean,
  location: Object,
  adminButton: Node | null,
  browseUrl?: string,
  editUrl?: string,
}) => (
  <Fragment>
    {ownProfile && editUrl && <Button to={editUrl}>Edit Profile</Button>}
    {adminButton}
    {!firstTimePublish && !editing && (
      <Button
        to={{
          pathname: browseUrl,
          state: location.state,
        }}
      >
        Back to list
      </Button>
    )}
  </Fragment>
)

export type BaseProfileData = {|
  id?: ?string,
  isFaculty?: boolean,

  name: string,
  contactEmail: string,
  imageUrl: ?string,

  affiliations: Array<string>,
  clinicalSpecialties: Array<string>,
  professionalInterests: Array<string>,
  partsOfMe: Array<string>,
  activities: Array<string>,
  degrees: Array<string>,

  additionalInformation: string,

  willingStudentGroup: boolean,
  willingDiscussPersonal: boolean,

  willingShadowing?: boolean,
  willingNetworking?: boolean,
  willingGoalSetting?: boolean,
  willingCareerGuidance?: boolean,

  willingDualDegrees?: boolean,
  willingAdviceClinicalRotations?: boolean,
  willingResearch?: boolean,
  willingResidency?: boolean,

  program?: ?string,
  pceSite?: ?string,
  currentYear?: ?string,

  cadence: string,
  otherCadence: ?string,
|}

function displayCadence(cadence: string, otherCadence: ?string) {
  if (cadence === 'other') {
    return otherCadence
  }

  return CADENCE_LABELS[cadence]
}

const Cadence = ({
  cadence,
  otherCadence,
}: {
  cadence: string,
  otherCadence: ?string,
}) => (
  <div style={{ marginTop: '1.2em' }}>
    <h4>Meeting Cadence</h4>
    {displayCadence(cadence, otherCadence)}
  </div>
)

const ClinicalInterests = ({ interests }: { interests: string }) => (
  <div>
    <h4>Clinical Interests</h4>
    <p style={{ paddingBottom: '1em' }}>{interests}</p>
  </div>
)

const AboutInfo = ({
  degrees,
  affiliations,
  clinicalSpecialties,
  professionalInterests,
  partsOfMe,
  additionalInformation,
  activities,
  program,
  pceSite,
  currentYear,
  RoleSpecificProfileView,
}: Object) => (
  <Fragment>
    <RoleSpecificProfileView
      degrees={degrees}
      program={program}
      pceSite={pceSite}
      currentYear={currentYear}
      affiliations={affiliations}
    />
    {clinicalSpecialties.length > 0 && (
      <ClinicalInterests interests={clinicalSpecialties.join(', ')} />
    )}
    {professionalInterests.length > 0 && (
      <div>
        <h4>Professional Interests</h4>
        <p style={{ paddingBottom: '1em' }}>
          {professionalInterests.join(', ')}
        </p>
      </div>
    )}
    {partsOfMe.length > 0 && (
      <div>
        <h4>Parts Of Me</h4>
        <p style={{ paddingBottom: '1em' }}>{partsOfMe.join(', ')}</p>
      </div>
    )}
    {activities.length > 0 && (
      <div>
        <h4>Activities I Enjoy</h4>
        <p style={{ paddingBottom: '1em' }}>{activities.join(', ')}</p>
      </div>
    )}
    {additionalInformation && (
      <div>
        <h4>Additional Information</h4>
        <p>{additionalInformation}</p>
      </div>
    )}
  </Fragment>
)

const ContactInformation = ({ contactEmail }: { contactEmail: string }) => {
  const [username, domain] = contactEmail.split('@')
  return (
    <Fragment>
      <h4>Contact Information</h4>

      <a className="contact-email" href={`mailto:${contactEmail}`}>
        {username}
        <wbr />@{domain}
      </a>
    </Fragment>
  )
}

const ProfileView = ({
  data,
  ownProfile = false,
  firstTimePublish = false,
  editing = false,
  isAdmin,
  location,
  profileId,
  dateUpdated,
  starred,
  history,
  RoleSpecificProfileView,
  browseUrl,
  editUrl,
  adminEditBaseUrl,
  RoleSpecificExpectations,
}: {
  data: Object,
  ownProfile?: boolean,
  firstTimePublish?: boolean,
  editing?: boolean,
  isAdmin?: boolean,
  location: Object,
  profileId?: ?string,
  dateUpdated?: Date,
  starred?: ?boolean,
  history: RouterHistory,
  RoleSpecificProfileView: Object,
  browseUrl?: string,
  editUrl?: string,
  adminEditBaseUrl?: string,
  RoleSpecificExpectations: Object,
}) => {
  const [starredState, setStarred] = useState(Boolean(starred))

  const adminButton =
    isAdmin && !ownProfile && profileId && adminEditBaseUrl ? (
      <Button to={`/${adminEditBaseUrl}/${profileId}`}>
        Edit profile as admin
      </Button>
    ) : null

  const buttons = (
    <Buttons
      ownProfile={ownProfile}
      firstTimePublish={firstTimePublish}
      editing={editing}
      location={location}
      adminButton={adminButton}
      browseUrl={browseUrl}
      editUrl={editUrl}
    />
  )
  const avatar = (
    <ProfileAvatar imageUrl={data.imageUrl} name={data.name} size={200} />
  )

  const lastUpdated =
    dateUpdated == null ? null : (
      <small>Profile last updated {dateUpdated.toLocaleDateString()}</small>
    )

  const aboutInfo = (
    <AboutInfo
      degrees={data.degrees}
      affiliations={data.affiliations}
      clinicalSpecialties={data.clinicalSpecialties}
      professionalInterests={data.professionalInterests}
      partsOfMe={data.partsOfMe}
      additionalInformation={data.additionalInformation}
      activities={data.activities}
      program={data.program}
      pceSite={data.pceSite}
      currentYear={data.currentYear}
      RoleSpecificProfileView={RoleSpecificProfileView}
    />
  )

  const roleSpecificExpecations = (
    <RoleSpecificExpectations
      willingShadowing={data.willingShadowing}
      willingNetworking={data.willingNetworking}
      willingGoalSetting={data.willingGoalSetting}
      willingDiscussPersonal={data.willingDiscussPersonal}
      willingCareerGuidance={data.willingCareerGuidance}
      willingStudentGroup={data.willingStudentGroup}
      willingDualDegrees={data.willingDualDegrees}
      willingAdviceClinicalRotations={data.willingAdviceClinicalRotations}
      willingResearch={data.willingResearch}
      willingResidency={data.willingResidency}
    />
  )

  return (
    <Fragment>
      <MediaQuery query="(max-device-width: 750px)">
        <div className="profile-contact">
          {buttons}

          {avatar}

          <h1>{data.name}</h1>

          <ContactInformation contactEmail={data.contactEmail} />

          <Cadence cadence={data.cadence} otherCadence={data.otherCadence} />

          {roleSpecificExpecations}

          {aboutInfo}

          {lastUpdated}
        </div>
      </MediaQuery>

      <MediaQuery query="(min-device-width: 750px)">
        <div className="profile-contact">
          <div className="columns">
            <div className="column contact">
              {profileId != null && !ownProfile && (
                <div data-tip data-for="starTooltip">
                  <ReactTooltip id="starTooltip" place="top">
                    Click here to{' '}
                    {starredState ? 'remove star' : 'mark profile as starred'}
                  </ReactTooltip>
                  <ProfileStar
                    active={starredState}
                    onClick={() => {
                      const newStarred = !starredState
                      setStarred(newStarred)
                      if (newStarred) {
                        starProfile(profileId)
                      } else {
                        unstarProfile(profileId)
                      }
                      history.replace(location.pathname, null)
                    }}
                    type="button"
                  />
                </div>
              )}

              {avatar}
              <ContactInformation contactEmail={data.contactEmail} />

              <Cadence
                cadence={data.cadence}
                otherCadence={data.otherCadence}
              />

              {roleSpecificExpecations}
            </div>
            <div className="about">
              {buttons}

              <h1>{data.name}</h1>

              {aboutInfo}

              {lastUpdated}
            </div>
          </div>
        </div>
      </MediaQuery>
    </Fragment>
  )
}

export default withRouter(ProfileView)
