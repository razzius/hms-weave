// @flow
import React, { Component } from 'react'
import { BrowserRouter as Router, Link, Route, Switch } from 'react-router-dom'

import Toggle from 'react-toggle-switch'
import ReactTooltip from 'react-tooltip'

import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import 'react-toggle-switch/dist/css/switch.min.css'
import 'blueimp-canvas-to-blob'

import './App.css'
import Browse from './Browse'
import CreateProfile from './CreateProfile'
import EditProfile from './EditProfile'
import Expectations from './Expectations'
import FacultyExpectations from './FacultyExpectations'
import Help from './Help'
import Home from './Home'
import Login from './Login'
import Logout from './Logout'
import MenteeExpectations from './MenteeExpectations'
import MentorExpectations from './MentorExpectations'
import NotLoggedIn from './NotLoggedIn'
import OurTeam from './OurTeam'
import Profile from './Profile'
import Resources from './Resources'
import StudentExpectations from './StudentExpectations'

import RegisterFacultyEmail from './RegisterFacultyEmail'
import RegisterStudentEmail from './RegisterStudentEmail'
import VerifyEmail from './VerifyEmail'
import { setAvailabilityForMentoring, verifyToken, type Account } from './api'
import { clearToken, loadToken } from './persistence'
import logging from './logging'
import LoggerContext from './logger-context'

type Props = empty
type State = {|
  token: string | null,
  account: Account | null,
  loading: boolean,
|}

class App extends Component<Props, State> {
  logger: Object

  constructor() {
    super()
    this.logger = logging({ sessionStart: new Date() })
  }

  state = {
    token: loadToken(),
    account: null,
    loading: true,
  }

  async componentDidMount() {
    this.logger.log('App component mounted')

    const { token } = this.state

    if (token !== null && window.location.pathname !== '/verify') {
      try {
        const account = await verifyToken(token)
        this.setState({ account })
      } catch (e) {
        clearToken()
        this.setState({ token: null })
      }
      this.setState({ loading: false })
    }
  }

  authenticate = ({ token, account }: { token: string, account: Account }) => {
    this.setState({ token, account })
  }

  setProfileId = (profileId: string) => {
    const { account } = this.state
    const newAccount = { ...account, profileId }
    this.setState({ account: newAccount })
  }

  logout = () => {
    clearToken()
    this.setState({ token: null, account: null })
    // todo logout on server as well
  }

  setAvailableForMentoring = () => {
    const { account } = this.state

    const updatedAccount = {
      ...account,
      availableForMentoring: true,
    }

    this.setState({ account: updatedAccount })
  }

  render() {
    const { token, account, loading } = this.state

    const loggedOut = token === null

    const loginButton = (
      <Link
        to="/login"
        className="App-title"
        style={{
          paddingTop: '1.4em',
          float: 'right',
          paddingRight: '2em',
        }}
      >
        Login
      </Link>
    )

    const logoutButton = (
      <Link
        to="/logout"
        className="App-title"
        style={{
          paddingTop: '1.4em',
          float: 'right',
          paddingRight: '2em',
          cursor: 'pointer',
        }}
      >
        Logout
      </Link>
    )

    const loginAction = loggedOut ? loginButton : logoutButton

    return (
      <LoggerContext.Provider value={{ logger: this.logger }}>
        <Router>
          <div className="App">
            <header className="App-header">
              <div className="header-inner">
                <Link to="/" className="App-title left">
                  <img src="/assets/hms-crest.svg" alt="HMS crest" />
                  <img src="/assets/hsdm-crest.svg" alt="HSDM crest" />
                  <h1>Weave</h1>
                </Link>

                {loginAction}

                {token && account && account.isMentor && (
                  <div
                    data-tip
                    className="available-for-mentoring"
                    data-for="toggleTooltip"
                  >
                    Available for mentoring:
                    <ReactTooltip id="toggleTooltip" place="bottom">
                      Controls whether your profile will be visible to mentees.
                    </ReactTooltip>
                    <Toggle
                      on={account.availableForMentoring}
                      onClick={() => {
                        const newAvailable = !account.availableForMentoring
                        const newAccount = {
                          ...account,
                          availableForMentoring: newAvailable,
                        }
                        this.setState({ account: newAccount })
                        if (account.profileId !== null) {
                          setAvailabilityForMentoring(token, newAvailable)
                        }
                      }}
                    />
                  </div>
                )}

                <nav>
                  <a href="/#about-weave" className="App-title">
                    About
                  </a>

                  <Link to="/expectations" className="App-title">
                    Expectations
                  </Link>

                  <Link to="/resources" className="App-title">
                    Resources
                  </Link>

                  <Link to="/help" className="App-title">
                    Help
                  </Link>

                  <Link to="/our-team" className="App-title">
                    Our&nbsp;Team
                  </Link>
                </nav>
              </div>
            </header>
            <Switch>
              <Route
                exact
                path="/"
                render={() => <Home token={token} account={account} />}
              />
              <Route
                path="/faculty-expectations"
                component={FacultyExpectations}
              />
              <Route
                path="/student-expectations"
                component={StudentExpectations}
              />
              <Route
                path="/create-profile"
                render={({ history }) => (
                  <CreateProfile
                    setProfileId={this.setProfileId}
                    token={token}
                    history={history}
                  />
                )}
              />
              <Route
                path="/edit-profile"
                render={({ history }) => {
                  if (account !== null) {
                    return (
                      <EditProfile
                        availableForMentoring={account.availableForMentoring}
                        setProfileId={this.setProfileId}
                        token={token}
                        history={history}
                        profileId={account.profileId}
                      />
                    )
                  }

                  return loading ? null : <NotLoggedIn />
                }}
              />
              <Route
                path="/admin-edit-profile/:id"
                render={({ history, match }) => {
                  if (account !== null) {
                    return (
                      <EditProfile
                        token={token}
                        isAdmin={account.isAdmin}
                        history={history}
                        profileId={match.params.id}
                      />
                    )
                  }

                  return loading ? null : <NotLoggedIn />
                }}
              />
              <Route
                path="/register-faculty-email"
                render={({ history }) => (
                  <RegisterFacultyEmail history={history} />
                )}
              />
              <Route
                path="/register-student-email"
                render={({ history }) => (
                  <RegisterStudentEmail history={history} />
                )}
              />
              <Route
                path="/verify"
                render={({ history }) => (
                  <VerifyEmail
                    authenticate={this.authenticate}
                    history={history}
                    account={account}
                    token={token}
                  />
                )}
              />
              <Route path="/browse" render={() => <Browse token={token} />} />
              <Route
                path="/login"
                render={({ history }) => <Login history={history} />}
              />

              <Route
                path="/logout"
                render={() => <Logout logout={this.logout} />}
              />

              <Route path="/expectations" component={Expectations} />
              <Route
                path="/mentor-expectations"
                component={MentorExpectations}
              />
              <Route
                path="/mentee-expectations"
                component={MenteeExpectations}
              />
              <Route path="/resources" component={Resources} />
              <Route path="/help" component={Help} />
              <Route path="/our-team" component={OurTeam} />

              <Route
                path="/profiles/:id"
                render={({ match }) =>
                  account && (
                    <Profile
                      profileId={account.profileId}
                      token={token}
                      isAdmin={account.isAdmin}
                      match={match}
                    />
                  )
                }
              />
              <Route component={() => <p>404 Not found</p>} />
            </Switch>
          </div>
        </Router>
      </LoggerContext.Provider>
    )
  }
}

export default App
