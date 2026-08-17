import type { Person } from '../model/types'

const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g

/** Fold Arabic orthographic variants so "أسامة" matches "اسامة". */
export function normalizeArabic(text: string): string {
  return text
    .normalize('NFKD')
    .replace(TASHKEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function matchesQuery(person: Person, query: string): boolean {
  const q = normalizeArabic(query)
  if (!q) return false
  const haystack = normalizeArabic(
    [person.name, person.fullLineage, person.branch, person.occupation]
      .filter(Boolean)
      .join(' '),
  )
  return haystack.includes(q)
}

export function searchPeople(people: Record<string, Person>, query: string): Person[] {
  if (!normalizeArabic(query)) return []
  return Object.values(people)
    .filter((p) => matchesQuery(p, query))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    .slice(0, 50)
}
