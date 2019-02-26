import professionalInterests from './professionalInterests'
import hospitals from './hospitals'
import clinicalSpecialties from './clinicalSpecialties'
import activitiesIEnjoyTags from './activitiesIEnjoyTags'
import titles from './titles'

function makeOptions(list) {
  return list.map(item => ({
    label: item,
    value: item,
  }))
}

export const clinicalSpecialtyOptions = makeOptions(clinicalSpecialties)

export const professionalInterestOptions = makeOptions(professionalInterests)

export const hospitalOptions = makeOptions(hospitals)

export const activitiesIEnjoyOptions = makeOptions(activitiesIEnjoyTags)

export const titleOptions = makeOptions(titles)
