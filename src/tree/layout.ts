import { hierarchy, tree, type HierarchyPointNode } from 'd3-hierarchy'
import { childrenIndex } from '../model/select'
import type { Person } from '../model/types'

export const NODE_W = 132
export const NODE_H = 92
export const SPOUSE_D = 92
export const GAP = 28
export const ROW_H = 230

export type NodeShape = 'square' | 'circle'

export interface LayoutNode {
  id: string
  person: Person
  /** centre of the node */
  x: number
  y: number
  w: number
  h: number
  shape: NodeShape
  /** depth of the owning cluster, 0 for roots */
  depth: number
}

export interface LayoutEdge {
  id: string
  points: [number, number][]
}

export interface Layout {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
  byId: Map<string, LayoutNode>
}

interface Cluster {
  /** the person that owns the slot in the tree */
  primaryId: string
  /** spouses drawn beside the primary */
  spouseIds: string[]
}

const clusterWidth = (c: Cluster) =>
  NODE_W + c.spouseIds.length * (GAP + SPOUSE_D)

/**
 * Decide which people own a slot in the tree and which are drawn as spouse
 * satellites next to their partner. A person with no parents who is married to
 * a placed person is a satellite; everyone else is a primary.
 */
function buildClusters(people: Record<string, Person>): Map<string, Cluster> {
  const hasParents = (p: Person) => Boolean(p.fatherId || p.motherId)
  const satelliteOf = new Map<string, string>()

  for (const p of Object.values(people)) {
    if (hasParents(p)) continue
    const host = p.spouseIds
      .map((id) => people[id])
      .filter(Boolean)
      .find((s) => hasParents(s) || (!hasParents(s) && s.id < p.id))
    if (host && !satelliteOf.has(host.id)) satelliteOf.set(p.id, host.id)
  }
  // A satellite cannot itself host a satellite.
  for (const [sid, host] of [...satelliteOf]) {
    if (satelliteOf.has(host)) satelliteOf.delete(sid)
  }

  const clusters = new Map<string, Cluster>()
  for (const p of Object.values(people)) {
    if (satelliteOf.has(p.id)) continue
    clusters.set(p.id, { primaryId: p.id, spouseIds: [] })
  }
  for (const [sid, host] of satelliteOf) clusters.get(host)?.spouseIds.push(sid)
  return clusters
}

/** The cluster a child hangs from: its father's, else its mother's. */
function ownerOf(person: Person, clusters: Map<string, Cluster>): string | undefined {
  if (person.fatherId && clusters.has(person.fatherId)) return person.fatherId
  if (person.motherId && clusters.has(person.motherId)) return person.motherId
  return person.fatherId ?? person.motherId
}

export function computeLayout(people: Record<string, Person>): Layout {
  const empty: Layout = {
    nodes: [],
    edges: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    byId: new Map(),
  }
  if (!Object.keys(people).length) return empty

  const clusters = buildClusters(people)
  const kids = childrenIndex(people)

  // children of a cluster: every child of the primary or of one of its spouses,
  // deduped, and only those that own a cluster themselves.
  const clusterChildren = new Map<string, string[]>()
  for (const [id, cluster] of clusters) {
    const ids = new Set<string>()
    for (const memberId of [cluster.primaryId, ...cluster.spouseIds]) {
      for (const childId of kids.get(memberId) ?? []) {
        const child = people[childId]
        if (!child || !clusters.has(childId)) continue
        if (ownerOf(child, clusters) === memberId) ids.add(childId)
      }
    }
    clusterChildren.set(id, [...ids])
  }

  const placedAsChild = new Set<string>()
  for (const list of clusterChildren.values()) for (const id of list) placedAsChild.add(id)
  const rootIds = [...clusters.keys()].filter((id) => !placedAsChild.has(id))

  const VIRTUAL = '__root__'
  const root = hierarchy<string>(VIRTUAL, (id) =>
    id === VIRTUAL ? rootIds : clusterChildren.get(id) ?? [],
  )

  const widthOf = (node: HierarchyPointNode<string> | { data: string }) =>
    node.data === VIRTUAL ? 0 : clusterWidth(clusters.get(node.data)!)

  tree<string>()
    .nodeSize([1, ROW_H])
    .separation((a, b) => widthOf(a) / 2 + widthOf(b) / 2 + GAP)(root)

  const nodes: LayoutNode[] = []
  const edges: LayoutEdge[] = []
  const clusterPos = new Map<string, { x: number; y: number; members: number[] }>()

  for (const point of root.descendants() as HierarchyPointNode<string>[]) {
    if (point.data === VIRTUAL) continue
    const cluster = clusters.get(point.data)!
    const w = clusterWidth(cluster)
    // Lay the cluster out left-to-right, then mirror the whole scene for RTL.
    let cursor = point.x - w / 2
    const y = point.y
    const memberCentres: number[] = []

    const primary = people[cluster.primaryId]
    nodes.push({
      id: primary.id,
      person: primary,
      x: cursor + NODE_W / 2,
      y,
      w: NODE_W,
      h: NODE_H,
      shape: primary.gender === 'female' ? 'circle' : 'square',
      depth: point.depth - 1,
    })
    memberCentres.push(cursor + NODE_W / 2)
    cursor += NODE_W + GAP

    for (const spouseId of cluster.spouseIds) {
      const spouse = people[spouseId]
      nodes.push({
        id: spouse.id,
        person: spouse,
        x: cursor + SPOUSE_D / 2,
        y,
        w: SPOUSE_D,
        h: SPOUSE_D,
        shape: spouse.gender === 'female' ? 'circle' : 'square',
        depth: point.depth - 1,
      })
      memberCentres.push(cursor + SPOUSE_D / 2)
      cursor += SPOUSE_D + GAP
    }

    clusterPos.set(point.data, { x: point.x, y, members: memberCentres })
  }

  // Mirror horizontally so the tree reads right-to-left.
  for (const n of nodes) n.x = -n.x
  for (const pos of clusterPos.values()) {
    pos.x = -pos.x
    pos.members = pos.members.map((x) => -x)
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  for (const [clusterId, children] of clusterChildren) {
    if (!children.length) continue
    const parent = clusterPos.get(clusterId)
    if (!parent) continue
    const parentBottom = parent.y + NODE_H / 2
    const barY = parentBottom + (ROW_H - NODE_H) / 2
    const childTops = children
      .map((id) => nodeById.get(id))
      .filter((n): n is LayoutNode => Boolean(n))

    // stubs down from every member of the parent cluster into the couple bar
    const stubY = parentBottom + (ROW_H - NODE_H) / 4
    if (parent.members.length > 1) {
      for (const x of parent.members)
        edges.push({ id: `stub-${clusterId}-${x}`, points: [[x, parentBottom], [x, stubY]] })
      const left = Math.min(...parent.members)
      const right = Math.max(...parent.members)
      edges.push({ id: `couple-${clusterId}`, points: [[left, stubY], [right, stubY]] })
    }

    // spine from the couple down to the children bar
    edges.push({
      id: `spine-${clusterId}`,
      points: [
        [parent.x, parent.members.length > 1 ? stubY : parentBottom],
        [parent.x, barY],
      ],
    })

    const xs = childTops.map((n) => n.x)
    edges.push({
      id: `bar-${clusterId}`,
      points: [
        [Math.min(...xs, parent.x), barY],
        [Math.max(...xs, parent.x), barY],
      ],
    })

    for (const child of childTops) {
      edges.push({
        id: `drop-${clusterId}-${child.id}`,
        points: [[child.x, barY], [child.x, child.y - child.h / 2]],
      })
    }
  }

  const xsAll = nodes.flatMap((n) => [n.x - n.w / 2, n.x + n.w / 2])
  const ysAll = nodes.flatMap((n) => [n.y - n.h / 2, n.y + n.h / 2])
  return {
    nodes,
    edges,
    bounds: {
      minX: Math.min(...xsAll),
      maxX: Math.max(...xsAll),
      minY: Math.min(...ysAll),
      maxY: Math.max(...ysAll),
    },
    byId: nodeById,
  }
}
