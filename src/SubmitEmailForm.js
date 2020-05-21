// @flow
import React, { Component, type Node } from 'react'
import { Link } from 'react-router-dom'
import ReactTooltip from 'react-tooltip'

import { any, getParam } from './utils'
import VALID_DOMAINS from './valid_domains.json'

function displayError(error, email) {
  if (error === null) {
    return null
  }

  if (error.name === 'TypeError') {
    return (
      <p className="error">
        There was a problem with our server. Please try again in a moment.
      </p>
    )
  }

  if (error.email[0] === 'unregistered') {
    return (
      <p className="error">
        That email has not been registered. Please sign up using the links
        above.
      </p>
    )
  }

  if (error.email[0] === 'claimed') {
    return (
      <p className="error">
        That email has already been registered. Please{' '}
        <Link to={`/login?email=${email}`}>log in</Link>.
      </p>
    )
  }
  return <p className="error">{error.email[0]}</p>
}

type Props = {
  sendEmail: ({| +email: string, +isPersonalDevice: boolean |}) => Object,
  header: string,
  instructions: Node,
  successMessage: string,
}

type State = {
  email: string,
  isPersonalDevice: boolean,
  success: boolean,
  error: Object | null,
}

type ReactEvent = SyntheticInputEvent<HTMLInputElement>

export default class SubmitEmailForm extends Component<Props, State> {
  state = {
    email: getParam('email') || '',
    isPersonalDevice: false,
    success: false,
    error: null,
  }

  submitEmail = async (e: Event) => {
    e.preventDefault()

    const { email, isPersonalDevice } = this.state
    const { sendEmail } = this.props

    try {
      await sendEmail({
        email,
        isPersonalDevice,
      })
      this.setState({ success: true })
    } catch (error) {
      this.setState({ error })
    }
  }

  updateEmail = (e: ReactEvent) => {
    this.setState({ email: e.target.value })
  }

  render() {
    const { header, instructions, successMessage } = this.props
    const { success, email } = this.state
    if (!success) {
      const { error, isPersonalDevice } = this.state

      const emailValid = any(
        VALID_DOMAINS.map(domain => email.toLowerCase().endsWith(domain))
      )

      return (
        <div>
          <h1>{header}</h1>
          <div>{instructions}</div>
          <form onSubmit={this.submitEmail}>
            <p>
              <input
                name="email"
                type="email"
                onChange={this.updateEmail}
                value={email}
              />
            </p>
            <ReactTooltip place="bottom" id="emailTooltip">
              Please enter your Harvard or hospital-affiliated email
            </ReactTooltip>
            {displayError(error, email)}
            <div>
              <input
                type="checkbox"
                value={isPersonalDevice}
                onClick={() =>
                  this.setState({
                    isPersonalDevice: !isPersonalDevice,
                  })
                }
              />
              This is a personal device (stay logged in for 2 weeks)
            </div>
            <div
              id="toggle"
              data-tip
              data-for="emailTooltip"
              data-tip-disable={email === '' || emailValid}
            >
              <button type="submit" disabled={!emailValid} className="button">
                Send verification email
              </button>
            </div>
          </form>
          <div className="validDomains">
            <p>
              Read about how email address validation works on the{' '}
              <a href="/help">Help</a> page.
            </p>
            <p>The following are the allowed email domains:</p>

            {VALID_DOMAINS.map(domain => (
              <div key={domain}>{domain.replace('@', '')}</div>
            ))}
            <p>
              If you have any questions, please email us at{' '}
              <a href="mailto:weave@hms.harvard.edu">weave@hms.harvard.edu</a>.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div>
        <h1>Verification email sent to {email}</h1>
        <p>{successMessage}</p>
      </div>
    )
  }
}
