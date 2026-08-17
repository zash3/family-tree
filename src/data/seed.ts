import type { Person, TreeDoc } from '../model/types'

/**
 * A small starter tree so the app is never empty on first run. Seeded only
 * when no persisted document exists.
 */
const rows: Person[] = [
  {
    id: 'p-alpha',
    name: 'اسامة',
    fullLineage: 'الثاني بن الثالث',
    gender: 'male',
    branch: 'الجذر',
    spouseIds: [],
  },
  {
    id: 'p-gamma',
    name: 'الأول',
    fullLineage: 'الأول بن اسامة بن ٧ ـ ',
    bio: 'مثال توضيحي فقط',
    gender: 'male',
    branch: 'الجذر',
    fatherId: 'p-alpha',
    spouseIds: ['p-delta'],
  },
  { id: 'p-delta', name: 'الرابعة', gender: 'female', branch: 'الجذر', spouseIds: ['p-gamma'] },

  { id: 'p-beta', name: 'الثاني', gender: 'male', branch: 'الجذر', fatherId: 'p-gamma', motherId: 'p-delta', spouseIds: [] },
  { id: 'p-epsilon', name: 'الخامس', gender: 'male', branch: 'الجذر', fatherId: 'p-gamma', motherId: 'p-delta', spouseIds: [] },
  { id: 'p-zeta', name: 'زياد', gender: 'male', branch: 'الجذر', fatherId: 'p-gamma', motherId: 'p-delta', spouseIds: [] },
  { id: 'p-eta', name: 'السادس', gender: 'male', branch: 'الجذر', fatherId: 'p-gamma', motherId: 'p-delta', spouseIds: [] },
  { id: 'p-theta', name: 'السابعة', gender: 'female', branch: 'الجذر', fatherId: 'p-gamma', motherId: 'p-delta', spouseIds: [] },
  { id: 'p-iota', name: 'الثامنة', gender: 'female', branch: 'الجذر', fatherId: 'p-gamma', motherId: 'p-delta', spouseIds: [] },

  { id: 'p-gamma-2', name: 'الأول', gender: 'male', branch: 'فرع الثاني', fatherId: 'p-beta', spouseIds: [] },
]

export function seedDoc(): TreeDoc {
  return {
    version: 1,
    title: 'شجرة العائلة',
    people: Object.fromEntries(rows.map((p) => [p.id, structuredClone(p)])),
  }
}
