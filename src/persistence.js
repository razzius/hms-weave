// @flow
import { addHours, isAfter, isValid } from 'date-fns'
import settings from './settings'

function pluralizeHour() {
  return settings.maxTokenAgeHours === 1 ? 'hour' : 'hours'
}

export function loggedOutNotification() {
  // eslint-disable-next-line no-alert
  alert(
    `For your security, you have been logged out due to reaching a maximum time of ${
      settings.maxTokenAgeHours
    } ${pluralizeHour()} since initial log in. You may log in again.`
  )
}

// export function saveToken(token: string) {
//   window.localStorage.setItem('tokenTimestamp', new Date().toISOString())
//   window.localStorage.setItem('token', token)
// }

// export function clearToken() {
//   window.localStorage.removeItem('tokenTimestamp')
//   window.localStorage.removeItem('token')
// }

// export function loadToken(): string | null {
//   const tokenTimestamp = window.localStorage.getItem('tokenTimestamp')
//   console.log('loadToken: tokenTimestamp', tokenTimestamp)

//   if (tokenTimestamp == null) {
//     return null
//   }

//   const tokenTimestampDate = new Date(tokenTimestamp)

//   if (!isValid(tokenTimestampDate)) {
//     console.log('loadToken: clearing token due to invalid tokenTimestamp')

//     clearToken()
//     return null
//   }

//   const whenTokenExpires = addHours(
//     new Date(tokenTimestamp),
//     settings.maxTokenAgeHours
//   )
//   console.log('loadToken: whenTokenExpires', whenTokenExpires)

//   const now = new Date()
//   console.log('loadToken: now', now)

//   if (isAfter(now, whenTokenExpires)) {
//     console.log('loadToken: clearing expired token')

//     clearToken()
//     return null
//   }

//   const token = window.localStorage.getItem('token')
//   console.log('loadToken: token', token)

//   return token
// }
