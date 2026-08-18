import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { seedDoc } from '../data/seed'
import type { Person, TreeDoc } from '../model/types'
import { assertValidPerson, parseDoc } from '../model/validate'
import { migrateLegacySeed } from './migrateLegacySeed'

export const STORAGE_KEY = 'family-tree/v1'

interface TreeState {
  doc: TreeDoc
  /** the tree as it was just before clearAll, for a single-step undo */
  undoDoc?: TreeDoc
  clearAll: () => void
  undoClear: () => void
  addPerson: (draft: Omit<Person, 'id'>) => string
  updatePerson: (id: string, patch: Partial<Omit<Person, 'id'>>) => void
  deletePerson: (id: string) => void
  linkSpouse: (a: string, b: string) => void
  unlinkSpouse: (a: string, b: string) => void
  importDoc: (raw: unknown) => void
  exportDoc: () => TreeDoc
  resetToSeed: () => void
}

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `p-${Math.abs(Date.now() ^ performance.now()).toString(36)}`

/**
 * Keep both sides of a spouse link in step. `people` is only a shallow copy of
 * the previous state, so every person this touches is replaced rather than
 * mutated — otherwise the edit would also rewrite the state we came from.
 */
function symmetrize(people: Record<string, Person>): void {
  const links = new Map<string, Set<string>>()
  for (const p of Object.values(people)) {
    links.set(p.id, new Set(p.spouseIds.filter((sid) => sid !== p.id && people[sid])))
  }
  for (const [id, ids] of links) {
    for (const sid of ids) links.get(sid)?.add(id)
  }
  for (const [id, ids] of links) {
    people[id] = { ...people[id], spouseIds: [...ids] }
  }
}

export const useTreeStore = create<TreeState>()(
  persist(
    (set, get) => ({
      doc: seedDoc(),

      addPerson(draft) {
        const id = newId()
        const person: Person = { ...draft, id, spouseIds: [...(draft.spouseIds ?? [])] }
        const people = { ...get().doc.people }
        assertValidPerson(people, person)
        people[id] = person
        symmetrize(people)
        set({ doc: { ...get().doc, people }, undoDoc: undefined })
        return id
      },

      updatePerson(id, patch) {
        const current = get().doc.people[id]
        if (!current) return
        const next: Person = { ...current, ...patch, id }
        const people = { ...get().doc.people }
        assertValidPerson(people, next)
        people[id] = next
        symmetrize(people)
        set({ doc: { ...get().doc, people } })
      },

      deletePerson(id) {
        const people = { ...get().doc.people }
        if (!people[id]) return
        delete people[id]
        for (const [pid, p] of Object.entries(people)) {
          const copy = { ...p }
          if (copy.fatherId === id) delete copy.fatherId
          if (copy.motherId === id) delete copy.motherId
          copy.spouseIds = copy.spouseIds.filter((sid) => sid !== id)
          people[pid] = copy
        }
        set({ doc: { ...get().doc, people } })
      },

      linkSpouse(a, b) {
        if (a === b) return
        const people = { ...get().doc.people }
        if (!people[a] || !people[b]) return
        people[a] = { ...people[a], spouseIds: [...people[a].spouseIds, b] }
        people[b] = { ...people[b], spouseIds: [...people[b].spouseIds] }
        symmetrize(people)
        set({ doc: { ...get().doc, people } })
      },

      unlinkSpouse(a, b) {
        const people = { ...get().doc.people }
        if (!people[a] || !people[b]) return
        people[a] = { ...people[a], spouseIds: people[a].spouseIds.filter((x) => x !== b) }
        people[b] = { ...people[b], spouseIds: people[b].spouseIds.filter((x) => x !== a) }
        set({ doc: { ...get().doc, people } })
      },

      importDoc(raw) {
        const doc = parseDoc(raw)
        symmetrize(doc.people)
        set({ doc, undoDoc: undefined })
      },

      exportDoc: () => get().doc,

      /**
       * Start an empty tree. Emptying is one action rather than N deletions,
       * and the previous tree is held in memory so the very next tap can undo
       * it — the confirm dialog alone is a thin guard on a phone.
       */
      clearAll() {
        const current = get().doc
        set({ doc: { ...current, people: {} }, undoDoc: current })
      },

      undoClear() {
        const undoDoc = get().undoDoc
        if (undoDoc) set({ doc: undoDoc, undoDoc: undefined })
      },

      resetToSeed: () => set({ doc: seedDoc(), undoDoc: undefined }),
    }),
    {
      name: STORAGE_KEY,
      // v2 retires the original example tree; see migrateLegacySeed.
      version: 2,
      partialize: (state) => ({ doc: state.doc }),
      migrate: (persisted, version) =>
        version < 2 ? migrateLegacySeed(persisted) : (persisted as { doc: TreeDoc }),
    },
  ),
)
