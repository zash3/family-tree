import type { Gender, Person } from '../model/types'

export interface FormDraft {
  /** present when editing an existing person */
  id?: string
  name: string
  gender: Gender
  fullLineage: string
  bio: string
  occupation: string
  branch: string
  birthYear: string
  deathYear: string
  notes: string
  fatherId: string
  motherId: string
  spouseId: string
  photoDataUrl?: string
}

export function draftFrom(person?: Person, preset?: Partial<FormDraft>): FormDraft {
  return {
    id: person?.id,
    name: person?.name ?? '',
    gender: person?.gender ?? 'male',
    fullLineage: person?.fullLineage ?? '',
    bio: person?.bio ?? '',
    occupation: person?.occupation ?? '',
    branch: person?.branch ?? '',
    birthYear: person?.birthYear ?? '',
    deathYear: person?.deathYear ?? '',
    notes: person?.notes ?? '',
    fatherId: person?.fatherId ?? '',
    motherId: person?.motherId ?? '',
    spouseId: person?.spouseIds[0] ?? '',
    photoDataUrl: person?.photoDataUrl,
    ...preset,
  }
}
