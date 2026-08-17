import { describe, expect, it } from 'vitest'
import { seedDoc } from '../data/seed'
import { normalizeArabic, searchPeople } from './search'

describe('search', () => {
  it('folds hamza, taa marbuta and alef maqsura', () => {
    expect(normalizeArabic('أسامة')).toBe(normalizeArabic('اسامة'))
    expect(normalizeArabic('فاطمة')).toBe(normalizeArabic('فاطمه'))
    expect(normalizeArabic('مصطفى')).toBe(normalizeArabic('مصطفي'))
  })

  it('strips tashkeel', () => {
    expect(normalizeArabic('مُحَمَّد')).toBe('محمد')
  })

  it('matches on name, lineage and branch', () => {
    const people = seedDoc().people
    expect(searchPeople(people, 'أسامة').map((p) => p.name)).toContain('اسامة')
    expect(searchPeople(people, '')).toHaveLength(0)
    expect(searchPeople(people, '').map((p) => p.id)).toContain('p-gamma')
    expect(searchPeople(people, 'فرع الثاني').map((p) => p.id)).toContain('p-gamma-2')
  })

  it('returns nothing for a blank query', () => {
    expect(searchPeople(seedDoc().people, '   ')).toHaveLength(0)
  })
})
