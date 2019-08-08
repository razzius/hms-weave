import 'core-js/es/map'
import 'core-js/es/set'
import 'react-app-polyfill/ie9'
import 'weakmap-polyfill'
import 'polyfill-array-includes'
import React from 'react'
import ReactDOM from 'react-dom'
import 'url-polyfill'
import { init } from '@sentry/browser'

import './index.css'
import App from './App'

if (window.location.hostname !== 'localhost') {
  init({
    dsn: process.env.JAVASCRIPT_SENTRY_DSN,
  })
}

ReactDOM.render(<App />, document.getElementById('root'))
