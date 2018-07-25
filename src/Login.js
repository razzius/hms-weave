import React from 'react'
import { Link } from "react-router-dom"

import AppScreen from './AppScreen'
import SubmitEmailForm from './SubmitEmailForm'

const Login = (props) => (
  <AppScreen>
    <h1>Login to edit mentor profile</h1>
    <p>Enter your Harvard or hospital-affiliated email and we will confirm your account by sending a verification email.</p>
    <p>
      <Link to="/faculty-expectations">If you have not signed up yet, please start here.</Link>
    </p>
    <SubmitEmailForm history={props.history} redirectTo={'/login-check-email'}/>
  </AppScreen>
)

export default Login
