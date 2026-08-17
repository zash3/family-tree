import { describe, expect, it } from 'vitest'
import { seedDoc } from '../data/seed'
import { computeLayout, NODE_H, ROW_H } from './layout'
import type { Person } from '../model/types'

const seed = () => seedDoc().people

describe('computeLayout', () => {
  it('returns an empty layout for an empty tree', () => {
    expect(computeLayout({}).nodes).toHaveLength(0)
  })

  it('places every person exactly once', () => {
    const people = seed()
    const layout = computeLayout(people)
    expect(layout.nodes).toHaveLength(Object.keys(people).length)
    expect(new Set(layout.nodes.map((n) => n.id)).size).toBe(layout.nodes.length)
  })

  it('puts each generation on its own row, deeper generations lower', () => {
    const layout = computeLayout(seed())
    const y = (id: string) => layout.byId.get(id)!.y
    expect(y('p-gamma')).toBeGreaterThan(y('p-alpha'))
    expect(y('p-beta')).toBeGreaterThan(y('p-gamma'))
    expect(y('p-gamma-2')).toBeGreaterThan(y('p-beta'))
    expect(y('p-beta') - y('p-gamma')).toBe(ROW_H)
  })

  it('draws a spouse beside her husband on the same row', () => {
    const layout = computeLayout(seed())
    const husband = layout.byId.get('p-gamma')!
    const wife = layout.byId.get('p-delta')!
    expect(wife.y).toBe(husband.y)
    expect(wife.shape).toBe('circle')
    // mirrored for RTL: the spouse sits to the left of the primary
    expect(wife.x).toBeLessThan(husband.x)
  })

  it('mirrors the layout so siblings read right to left in birth order', () => {
    const layout = computeLayout(seed())
    const xs = ['p-beta', 'p-epsilon', 'p-zeta', 'p-eta'].map((id) => layout.byId.get(id)!.x)
    for (let i = 1; i < xs.length; i += 1) expect(xs[i]).toBeLessThan(xs[i - 1])
  })

  it('never overlaps two nodes on the same row', () => {
    const layout = computeLayout(seed())
    const rows = new Map<number, typeof layout.nodes>()
    for (const n of layout.nodes) rows.set(n.y, [...(rows.get(n.y) ?? []), n])
    for (const row of rows.values()) {
      const sorted = [...row].sort((a, b) => a.x - b.x)
      for (let i = 1; i < sorted.length; i += 1) {
        const gap = sorted[i].x - sorted[i].w / 2 - (sorted[i - 1].x + sorted[i - 1].w / 2)
        expect(gap).toBeGreaterThan(0)
      }
    }
  })

  it('connects every child to its parent cluster', () => {
    const layout = computeLayout(seed())
    for (const id of ['p-beta', 'p-epsilon', 'p-iota']) {
      expect(layout.edges.some((e) => e.id === `drop-p-gamma-${id}`)).toBe(true)
    }
  })

  it('handles several disconnected roots', () => {
    const people: Record<string, Person> = {
      a: { id: 'a', name: 'أ', gender: 'male', spouseIds: [] },
      b: { id: 'b', name: 'ب', gender: 'male', spouseIds: [] },
    }
    const layout = computeLayout(people)
    expect(layout.nodes).toHaveLength(2)
    expect(layout.byId.get('a')!.y).toBe(layout.byId.get('b')!.y)
  })

  it('keeps the node box height stable', () => {
    expect(computeLayout(seed()).byId.get('p-beta')!.h).toBe(NODE_H)
  })
})
