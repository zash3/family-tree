import { ar } from '../i18n/ar'
import type { Person, TreeDoc } from './types'

export class ValidationError extends Error {}

/** Walk up the ancestor chain from `startId`; true if `targetId` is reached. */
export function isAncestorOf(
  people: Record<string, Person>,
  targetId: string,
  startId: string | undefined,
): boolean {
  const seen = new Set<string>()
  let frontier = startId ? [startId] : []
  while (frontier.length) {
    const next: string[] = []
    for (const id of frontier) {
      if (id === targetId) return true
      if (seen.has(id)) continue
      seen.add(id)
      const p = people[id]
      if (!p) continue
      if (p.fatherId) next.push(p.fatherId)
      if (p.motherId) next.push(p.motherId)
    }
    frontier = next
  }
  return false
}

/**
 * Validate a person about to be written into `people`. `people` must NOT yet
 * contain the pending edit, but may contain the person's previous version.
 */
export function assertValidPerson(people: Record<string, Person>, person: Person): void {
  if (!person.name.trim()) throw new ValidationError(ar.errNameRequired)

  for (const parentId of [person.fatherId, person.motherId]) {
    if (!parentId) continue
    if (parentId === person.id) throw new ValidationError(ar.errSelfParent)
    // The parent must not be a descendant of this person.
    if (isAncestorOf({ ...people, [person.id]: person }, person.id, parentId))
      throw new ValidationError(ar.errCycle)
  }

  const father = person.fatherId ? people[person.fatherId] : undefined
  if (father && father.gender !== 'male') throw new ValidationError(ar.errFatherMale)
  const mother = person.motherId ? people[person.motherId] : undefined
  if (mother && mother.gender !== 'female') throw new ValidationError(ar.errMotherFemale)
}

/** Parse an imported document, dropping dangling references rather than failing. */
export function parseDoc(raw: unknown): TreeDoc {
  if (!raw || typeof raw !== 'object') throw new ValidationError(ar.errBadFile)
  const doc = raw as Partial<TreeDoc>
  if (!doc.people || typeof doc.people !== 'object') throw new ValidationError(ar.errBadFile)

  const people: Record<string, Person> = {}
  for (const [id, value] of Object.entries(doc.people)) {
    const p = value as Partial<Person>
    if (!p || typeof p.name !== 'string') throw new ValidationError(ar.errBadFile)
    people[id] = {
      ...p,
      id,
      name: p.name,
      gender: p.gender === 'female' ? 'female' : 'male',
      spouseIds: Array.isArray(p.spouseIds) ? p.spouseIds : [],
    } as Person
  }

  // Drop references to people that are not in the document.
  for (const p of Object.values(people)) {
    if (p.fatherId && !people[p.fatherId]) delete p.fatherId
    if (p.motherId && !people[p.motherId]) delete p.motherId
    p.spouseIds = p.spouseIds.filter((sid) => people[sid] && sid !== p.id)
  }

  return { version: 1, title: typeof doc.title === 'string' ? doc.title : ar.appTitle, people }
}
