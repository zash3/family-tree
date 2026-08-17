export type Gender = 'male' | 'female'

export interface Person {
  id: string
  /** الاسم الأول — the label drawn inside the node */
  name: string
  /** النسب — the full lineage line shown in the detail card */
  fullLineage?: string
  gender: Gender
  /** free paragraph (مطوع وإمام جامع …) */
  bio?: string
  occupation?: string
  branch?: string
  /** small inline image, capped at MAX_PHOTO_BYTES */
  photoDataUrl?: string
  birthYear?: string
  deathYear?: string
  alive?: boolean
  fatherId?: string
  motherId?: string
  spouseIds: string[]
  notes?: string
}

export interface TreeDoc {
  version: 1
  title: string
  people: Record<string, Person>
}

export const MAX_PHOTO_BYTES = 200_000

export function emptyPerson(gender: Gender = 'male'): Omit<Person, 'id'> {
  return { name: '', gender, spouseIds: [] }
}
