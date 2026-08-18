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
      fatherId: 'p-4',
    })
    expect(childrenOf(store().doc.people, 'p-4').map((p) => p.id)).toContain(id)
  })

  it('rejects an empty name', () => {
    expect(() => store().addPerson({ name: '  ', gender: 'male', spouseIds: [] })).toThrow(
      ValidationError,
    )
  })

  it('rejects a cycle in the lineage', () => {
    expect(() => store().updatePerson('p-1', { fatherId: 'p-4' })).toThrow(
      ValidationError,
    )
    expect(store().doc.people['p-1'].fatherId).toBeUndefined()
  })

  it('rejects a self parent', () => {
    expect(() => store().updatePerson('p-4', { fatherId: 'p-4' })).toThrow(ValidationError)
  })

  it('rejects a female father', () => {
    expect(() => store().updatePerson('p-4', { fatherId: 'p-3' })).toThrow(ValidationError)
  })

  it('keeps spouse links symmetric', () => {
    const id = store().addPerson({ name: 'نورة', gender: 'female', spouseIds: [] })
    store().linkSpouse('p-4', id)
    expect(store().doc.people[id].spouseIds).toContain('p-4')
    store().unlinkSpouse('p-4', id)
    expect(store().doc.people[id].spouseIds).not.toContain('p-4')
    expect(store().doc.people['p-4'].spouseIds).not.toContain(id)
  })

  it('does not write spouse links back into the previous state', () => {
    const before = store().doc
    const sonBefore = before.people['p-4']
    const id = store().addPerson({ name: 'نورة', gender: 'female', spouseIds: ['p-4'] })
    expect(store().doc.people['p-4'].spouseIds).toContain(id)
    // the snapshot taken before the edit must be untouched
    expect(sonBefore.spouseIds).toHaveLength(0)
    expect(before.people['p-4'].spouseIds).toHaveLength(0)
  })

  it('detaches children and spouses when a person is deleted', () => {
    store().deletePerson('p-2')
    const people = store().doc.people
    expect(people['p-2']).toBeUndefined()
    expect(people['p-4'].fatherId).toBeUndefined()
    expect(people['p-4'].motherId).toBe('p-3')
    expect(people['p-3'].spouseIds).toHaveLength(0)
  })

  it('round-trips through export and import', () => {
    const exported = JSON.parse(JSON.stringify(store().exportDoc()))
    store().resetToSeed()
    store().deletePerson('p-4')
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

describe('clearAll', () => {
  beforeEach(() => {
    useTreeStore.setState({ doc: seedDoc(), undoDoc: undefined })
  })

  it('empties the whole tree in one action', () => {
    store().clearAll()
    expect(Object.keys(store().doc.people)).toHaveLength(0)
  })

  it('can be undone in one step', () => {
    const before = Object.keys(store().doc.people).sort()
    store().clearAll()
    store().undoClear()
    expect(Object.keys(store().doc.people).sort()).toEqual(before)
    expect(store().undoDoc).toBeUndefined()
  })

  it('retires the undo once the user starts building', () => {
    store().clearAll()
    store().addPerson({ name: 'سعود', gender: 'male', spouseIds: [] })
    expect(store().undoDoc).toBeUndefined()
    store().undoClear()
    expect(Object.keys(store().doc.people)).toHaveLength(1)
  })

  it('keeps the title so an emptied tree is still the same document', () => {
    store().clearAll()
    expect(store().doc.title).toBe(seedDoc().title)
  })
})
