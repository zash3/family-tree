import type { Person } from './types'

/**
 * Children are always derived from the parent links, never stored, so add and
 * delete cannot leave the two sides out of sync.
 */
export function childrenIndex(people: Record<string, Person>): Map<string, string[]> {
  const index = new Map<string, string[]>()
  const push = (parentId: string, childId: string) => {
    const list = index.get(parentId)
    if (list) list.push(childId)
    else index.set(parentId, [childId])
  }
  for (const p of Object.values(people)) {
    if (p.fatherId) push(p.fatherId, p.id)
    if (p.motherId) push(p.motherId, p.id)
  }
  return index
}

export function childrenOf(people: Record<string, Person>, id: string): Person[] {
  return childrenIndex(people)
    .get(id)
    ?.map((cid) => people[cid])
    .filter(Boolean) ?? []
}

export function branchesOf(people: Record<string, Person>): string[] {
  const set = new Set<string>()
  for (const p of Object.values(people)) if (p.branch?.trim()) set.add(p.branch.trim())
  return [...set].sort((a, b) => a.localeCompare(b, 'ar'))
}
