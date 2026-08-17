import { beforeEach, describe, expect, it } from 'vitest'
import { seedDoc } from '../data/seed'
import { childrenOf } from '../model/select'
import { ValidationError } from '../model/validate'
import { useTreeStore } from './treeStore'

const store = () => useTreeStore.getState()

describe('treeStore', () => {
  beforeEach(() => {
    useTreeStore.setState({ doc: seedDoc() })
  })

  it('adds a person and derives them as a child of their father', () => {
    const id = store().addPerson({
      name: 'التاسع',
      gender: 'male',
      spouseIds: [],
      fatherId: 'p-beta',
    })
    expect(childrenOf(store().doc.people, 'p-beta').map((p) => p.id)).toContain(id)
  })

  it('rejects an empty name', () => {
    expect(() => store().addPerson({ name: '  ', gender: 'male', spouseIds: [] })).toThrow(
      ValidationError,
    )
  })

  it('rejects a cycle in the lineage', () => {
    expect(() => store().updatePerson('p-alpha', { fatherId: 'p-beta' })).toThrow(
      ValidationError,
    )
    expect(store().doc.people['p-alpha'].fatherId).toBeUndefined()
  })

  it('rejects a self parent', () => {
    expect(() => store().updatePerson('p-beta', { fatherId: 'p-beta' })).toThrow(ValidationError)
  })

  it('rejects a female father', () => {
    expect(() => store().updatePerson('p-beta', { fatherId: 'p-delta' })).toThrow(ValidationError)
  })

  it('keeps spouse links symmetric', () => {
    const id = store().addPerson({ name: 'نورة', gender: 'female', spouseIds: [] })
    store().linkSpouse('p-beta', id)
    expect(store().doc.people[id].spouseIds).toContain('p-beta')
    store().unlinkSpouse('p-beta', id)
    expect(store().doc.people[id].spouseIds).not.toContain('p-beta')
    expect(store().doc.people['p-beta'].spouseIds).not.toContain(id)
  })

  it('detaches children and spouses when a person is deleted', () => {
    store().deletePerson('p-gamma')
    const people = store().doc.people
    expect(people['p-gamma']).toBeUndefined()
    expect(people['p-beta'].fatherId).toBeUndefined()
    expect(people['p-beta'].motherId).toBe('p-delta')
    expect(people['p-delta'].spouseIds).toHaveLength(0)
  })

  it('round-trips through export and import', () => {
    const exported = JSON.parse(JSON.stringify(store().exportDoc()))
    store().resetToSeed()
    store().deletePerson('p-beta')
    store().importDoc(exported)
    expect(Object.keys(store().doc.people).sort()).toEqual(Object.keys(exported.people).sort())
  })

  it('drops dangling references on import', () => {
    store().importDoc({
      version: 1,
      title: 'x',
      people: { a: { id: 'a', name: 'أ', gender: 'male', fatherId: 'ghost', spouseIds: ['ghost'] } },
    })
    expect(store().doc.people.a.fatherId).toBeUndefined()
    expect(store().doc.people.a.spouseIds).toHaveLength(0)
  })

  it('refuses a document that is not a tree', () => {
    expect(() => store().importDoc({ nope: true })).toThrow(ValidationError)
  })
})
