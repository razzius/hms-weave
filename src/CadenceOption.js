// @flow
import React from 'react'

type Props = {
  value: string,
  selectedCadence: string,
  onChange: ({ target: HTMLInputElement }) => void,
}

export const CADENCE_LABELS = {
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  '2-3 conversations/year': '2-3 conversations/year',
}

const CadenceOption = ({ value, onChange, selectedCadence }: Props) => {
  const id = `${value}-cadence`

  const label = CADENCE_LABELS[value]
  return (
    <label htmlFor={id}>
      <input
        id={id}
        onChange={onChange}
        value={value}
        checked={selectedCadence === value}
        name="cadence"
        type="radio"
      />
      {label}
    </label>
  )
}

export default CadenceOption
