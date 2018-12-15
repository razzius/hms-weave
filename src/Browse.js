import React, { Component } from 'react'
import Waypoint from 'react-waypoint'

import ProfileResult from './ProfileResult'
import SearchInput from './SearchInput'
import { getProfiles } from './api'
import AppScreen from './AppScreen'

function pluralizeResults(length) {
  if (length === 1) {
    return 'result'
  }
  return 'results'
}

export default class Browse extends Component {
  state = {
    loading: true,
    searchTerms: [],
    search: '',
    results: null,
    queried: false,
    error: null,
    page: 1
  }

  constructor(props) {
    super(props)

    getProfiles({ token: props.token, page: this.state.page })
      .then(results => {
        this.setState({ results, loading: false })
      })
      .catch(() =>
        this.setState({ error: 'Unable to load profiles. Try again later.' })
      )
  }

  handleSearch = () => {
    this.setState({ loading: true })

    const { token } = this.props
    const { searchTerms, search, page } = this.state
    const searchArray = search === '' ? [] : [search]
    const query = searchTerms
      .concat(searchArray)
      .join(' ')
      .toLowerCase()

    return getProfiles({ token, query, page: this.state.page }).then(
      results => {
        if (page > 1) {
          const updatedProfiles = this.state.results.profiles.concat(
            results.profiles
          )

          this.setState({
            results: {
              ...this.state.results,
              profiles: updatedProfiles
            },
            loading: false
          })
        } else {
          this.setState({ results, loading: false })
        }
      }
    )
  }

  handleChange = tags => {
    this.setState(
      { searchTerms: tags.map(tag => tag.value), page: 1 },
      this.handleSearch
    )
  }

  handleInputChange = (value, {action}) => {
    // Weird case. Deserves being written up. See
    // https://github.com/JedWatson/react-select/issues/1826#issuecomment-406020708
    if (['input-blur', 'menu-close'].includes(action)) {
      console.log(`Not going to do anything on action ${action}`)
      return
    }

    this.setState({ search: value })
  }

  resetSearch = () => {
    this.setState(
      {
        searchTerms: [],
        search: '',
        queried: false
      },
      this.handleSearch
    )
  }

  render() {
    const { error, loading, results } = this.state

    const waypoint = !this.state.loading &&
      this.state.results.profiles.length < this.state.results.profileCount && (
        <Waypoint
          onEnter={() => {
            this.setState({ page: this.state.page + 1 }, this.handleSearch)
          }}
        />
      )

    const profileElements =
      results !== null
        ? results.profiles.map(result => (
            <ProfileResult key={result.id} {...result} />
          ))
        : null

    let profileItems

    if (waypoint) {
      const insertionPoint = profileElements.length - 10
      profileItems = [
        ...profileElements.slice(0, insertionPoint),
        waypoint,
        ...profileElements.slice(insertionPoint)
      ]
    } else {
      profileItems = profileElements
    }

    return (
      <AppScreen>
        <SearchInput
          value={this.state.searchTerms}
          inputValue={this.state.search}
          onChange={this.handleChange}
          onInputChange={this.handleInputChange}
          onSubmit={this.handleSearch}
        />
        <div style={{ padding: '1em 0' }}>
          {(error !== null && error) ||
            (results === null && <p>Loading...</p>) || (
              <div>
                <p>
                  Showing {results.profiles.length}{' '}
                  {pluralizeResults(results.profiles.length)} of{' '}
                  {results.profileCount}. {loading && <span>Loading...</span>}
                  {this.state.queried && (
                    <button onClick={this.resetSearch}>Clear search</button>
                  )}
                </p>
                <div>{profileItems}</div>
              </div>
            )}
        </div>
      </AppScreen>
    )
  }
}
