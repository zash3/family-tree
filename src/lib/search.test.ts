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

  it('matches on name, lineage, branch and occupation', () => {
    const people = seedDoc().people
    expect(searchPeople(people, 'نوره').map((p) => p.name)).toContain('نورة')
    expect(searchPeople(people, 'بن سالم').map((p) => p.id)).toContain('p-2')
    expect(searchPeople(people, 'فرع أحمد').map((p) => p.id)).toContain('p-10')
    expect(searchPeople(people, 'معلم').map((p) => p.id)).toContain('p-2')
    expect(searchPeople(people, 'زيتون')).toHaveLength(0)
  })

  it('returns nothing for a blank query', () => {
    expect(searchPeople(seedDoc().people, '   ')).toHaveLength(0)
  })
})
