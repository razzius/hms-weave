// @flow
import React from 'react'
import { Link } from 'react-router-dom'
import { LiteralLink } from './utils'

import { type Account } from './api'

function getFacultyLink(token, profileId) {
  if (token === null) return '/faculty-expectations'
  if (profileId == null) return '/create-profile'
  return `/profiles/${profileId}`
}

function getFacultyText(token, profileId) {
  if (token === null) return 'Register as a faculty member'
  if (profileId === null) return 'Create profile'
  return 'View my profile'
}

const FacultyLanding = ({
  profileId,
  token,
  isMentor,
}: {
  profileId: ?string,
  token: string | null,
  isMentor: boolean,
}) => {
  if (token && !isMentor) {
    return null
  }

  return (
    <div>
      <h1>Faculty</h1>
      <Link className="button" to={getFacultyLink(token, profileId)}>
        {getFacultyText(token, profileId)}
      </Link>
    </div>
  )
}

const Home = ({
  token,
  account,
}: {
  token: string | null,
  account: ?Account,
}) => {
  const isMentor = account && account.isMentor
  const profileId = account && account.profileId

  return (
    <div className="Home">
      <p className="error banner" style={{ textAlign: 'center' }}>
        During the current COVID-19 pandemic, we are encouraging mentor and
        mentee pairs to meet over Zoom. All Harvard students and faculty receive
        free Zoom access available at:{' '}
        <LiteralLink href="https://harvard.zoom.us/" />. This recommendation
        will remain active throughout the COVID-19 pandemic. More information
        can be found on the CDC&apos;s website:
        <br />
        <LiteralLink href="https://www.cdc.gov/coronavirus/2019-ncov/index.html" />
      </p>
      <div id="background">
        <div className="App-intro">
          {(token === null || isMentor === false) && (
            <div>
              <h1>Students</h1>
              <Link
                className="button"
                to={token ? '/browse' : '/student-expectations'}
              >
                {token
                  ? 'Browse all faculty profiles'
                  : 'Register as a student'}
              </Link>
            </div>
          )}
          <FacultyLanding
            token={token}
            isMentor={Boolean(isMentor)}
            profileId={profileId}
          />
          {isMentor && (
            <div>
              <Link className="button" to="/browse">
                Browse all faculty profiles
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
