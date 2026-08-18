import type { Person, TreeDoc } from '../model/types'

/**
 * A small starter tree so the app is never empty on first run. Seeded only when
 * no persisted document exists.
 *
 * These are deliberately generic placeholder names — the repository is public,
 * so no real family's data lives here. Replace them with your own, or clear
 * them out and start from an empty tree.
 */
const rows: Person[] = [
  {
    id: 'p-1',
    name: 'سالم',
    fullLineage: 'سالم بن عبدالله',
    gender: 'male',
    branch: 'الجذر',
    spouseIds: [],
  },
  {
    id: 'p-2',
    name: 'عبدالله',
    fullLineage: 'عبدالله بن سالم',
    bio: 'مثال توضيحي فقط — استبدل هذه البيانات ببيانات عائلتك، أو احذفها وابدأ بشجرة فارغة.',
    occupation: 'معلّم',
    gender: 'male',
    branch: 'الجذر',
    fatherId: 'p-1',
    spouseIds: ['p-3'],
  },
  { id: 'p-3', name: 'منى', gender: 'female', branch: 'الجذر', spouseIds: ['p-2'] },

  { id: 'p-4', name: 'أحمد', gender: 'male', branch: 'الجذر', fatherId: 'p-2', motherId: 'p-3', spouseIds: [] },
  { id: 'p-5', name: 'خالد', gender: 'male', branch: 'الجذر', fatherId: 'p-2', motherId: 'p-3', spouseIds: [] },
  { id: 'p-6', name: 'فهد', gender: 'male', branch: 'الجذر', fatherId: 'p-2', motherId: 'p-3', spouseIds: [] },
  { id: 'p-7', name: 'ناصر', gender: 'male', branch: 'الجذر', fatherId: 'p-2', motherId: 'p-3', spouseIds: [] },
  { id: 'p-8', name: 'نورة', gender: 'female', branch: 'الجذر', fatherId: 'p-2', motherId: 'p-3', spouseIds: [] },
  { id: 'p-9', name: 'ريم', gender: 'female', branch: 'الجذر', fatherId: 'p-2', motherId: 'p-3', spouseIds: [] },

  { id: 'p-10', name: 'سعد', gender: 'male', branch: 'فرع أحمد', fatherId: 'p-4', spouseIds: [] },
]

export function seedDoc(): TreeDoc {
  return {
    version: 1,
    title: 'شجرة العائلة',
    people: Object.fromEntries(rows.map((p) => [p.id, structuredClone(p)])),
  }
}
