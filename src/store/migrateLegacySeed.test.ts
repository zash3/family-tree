import { describe, expect, it } from 'vitest'
import { seedDoc } from '../data/seed'
import type { Person, TreeDoc } from '../model/types'
import { LEGACY_BACKUP_KEY, isLegacySeedDoc, migrateLegacySeed } from './migrateLegacySeed'

const person = (id: string, name: string): Person => ({ id, name, gender: 'male', spouseIds: [] })

const legacyDoc = (extra: Person[] = []): TreeDoc => ({
  version: 1,
  title: 'شجرة العائلة',
  people: Object.fromEntries(
    [person('p-alpha', 'الأول'), person('p-beta', 'الثاني'), ...extra].map((p) => [p.id, p]),
  ),
})

describe('migrateLegacySeed', () => {
  it('recognises a document made only of the old example', () => {
    expect(isLegacySeedDoc(legacyDoc())).toBe(true)
    expect(isLegacySeedDoc(legacyDoc([person('new-1', 'سعود')]))).toBe(false)
    expect(isLegacySeedDoc(legacyDoc([person('p-gamma-2', 'الثالث')]))).toBe(true)
    expect(isLegacySeedDoc(undefined)).toBe(false)
    expect(isLegacySeedDoc({ version: 1, title: '', people: {} })).toBe(false)
    // the current seed and anything the user adds must never look legacy
    expect(isLegacySeedDoc(seedDoc())).toBe(false)
    expect(isLegacySeedDoc(legacyDoc([person(crypto.randomUUID(), 'سعود')]))).toBe(false)
  })

  it('replaces the old example with the current seed', () => {
    const { doc } = migrateLegacySeed({ doc: legacyDoc() })
    const names = Object.values(doc.people).map((p) => p.name)
    expect(names).not.toContain('الأول')
    expect(names).not.toContain('الثاني')
    expect(names).toContain('سالم')
  })

  it('keeps a recoverable backup of what it discarded', () => {
    localStorage.removeItem(LEGACY_BACKUP_KEY)
    migrateLegacySeed({ doc: legacyDoc() })
    const backup = JSON.parse(localStorage.getItem(LEGACY_BACKUP_KEY)!)
    expect(Object.keys(backup.people)).toContain('p-alpha')
  })

  it('leaves a tree the user has actually built alone', () => {
    const mine = legacyDoc([person('new-1', 'سعود')])
    expect(migrateLegacySeed({ doc: mine }).doc).toBe(mine)
  })

  it('falls back to the seed when there is nothing persisted', () => {
    expect(Object.keys(migrateLegacySeed(undefined).doc.people).length).toBeGreaterThan(0)
  })
})
