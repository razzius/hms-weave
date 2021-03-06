// @flow
import React, { Component } from 'react'
import CreatableSelect from 'react-select/creatable'
import { type OptionsType } from 'react-select/src/types'

import { capitalize, caseInsensitiveFind } from './utils'

type Props = {
  options?: OptionsType,
  values: Array<string>,
  handleChange: (any, Object) => void,
  placeholder?: string,
  handleAdd: any => void,
  noOptionsMessage?: ({ inputValue: string }) => string | null,
}

type State = {
  inputValue: string,
  menuOpen: boolean,
}

export default class CreatableTagSelect extends Component<Props, State> {
  static defaultProps = {
    options: [],
    placeholder: 'Select or type something and press enter...',
    noOptionsMessage: () => null,
  }

  state = {
    inputValue: '',
    menuOpen: false,
  }

  handleInputChange = (inputValue: string) => {
    this.setState({
      inputValue: inputValue.slice(0, 50),
    })
  }

  handleOnBlur = () => {
    const { inputValue } = this.state

    if (inputValue !== '') {
      this.handleAdd(capitalize(inputValue))
    }
    this.setState({ menuOpen: false })
  }

  handleKeyDown = (event: SyntheticKeyboardEvent<HTMLElement>) => {
    if ([',', ';'].includes(event.key)) {
      event.preventDefault()

      const { inputValue } = this.state
      const { options } = this.props

      if (inputValue === '') {
        return
      }

      this.setState({
        inputValue: '',
      })

      // $FlowFixMe unresolved issue; defaultProps should always make values defined
      const values = options.map(({ value }) => value)
      const caseInsensitiveMatch = caseInsensitiveFind(inputValue, values)

      let valueToAdd
      if (caseInsensitiveMatch) {
        valueToAdd = caseInsensitiveMatch
      } else {
        valueToAdd = capitalize(inputValue)
      }
      this.handleAdd(valueToAdd)
      this.setState({ menuOpen: false })
      return
    }
    if (!event.key.startsWith('Arrow')) {
      this.setState({ menuOpen: true })
    }
  }

  handleAdd = (selected: string) => {
    const { handleAdd } = this.props
    handleAdd(selected)
  }

  render() {
    const { inputValue, menuOpen } = this.state
    const {
      handleChange,
      values,
      options,
      placeholder,
      noOptionsMessage,
    } = this.props
    return (
      <CreatableSelect
        styles={{
          control: base => ({ ...base, backgroundColor: 'white' }),
          multiValue: styles => ({ ...styles, backgroundColor: '#edf4fe' }),
        }}
        value={values.map(value => ({ label: value, value }))}
        onInputChange={this.handleInputChange}
        menuIsOpen={menuOpen}
        inputValue={inputValue}
        className="column"
        isMulti
        onChange={(newValues, meta) => {
          this.setState({ menuOpen: false })
          handleChange(newValues, meta)
        }}
        onKeyDown={this.handleKeyDown}
        onFocus={() => {
          this.setState({ menuOpen: true })
        }}
        onBlur={this.handleOnBlur}
        options={options}
        placeholder={placeholder}
        noOptionsMessage={noOptionsMessage}
      />
    )
  }
}
