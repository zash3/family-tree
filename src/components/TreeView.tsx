import { useCallback, useEffect, useMemo, useRef } from 'react'
import { select } from 'd3-selection'
import 'd3-transition'
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { ar } from '../i18n/ar'
import { computeLayout, type LayoutNode } from '../tree/layout'
import type { Person } from '../model/types'

interface Props {
  people: Record<string, Person>
  selectedId?: string
  highlightIds?: Set<string>
  dimUnhighlighted?: boolean
  focusId?: string
  onSelect: (id: string) => void
  svgRef?: React.RefObject<SVGSVGElement | null>
}

const PADDING = 120

export default function TreeView({
  people,
  selectedId,
  highlightIds,
  dimUnhighlighted,
  focusId,
  onSelect,
  svgRef: externalSvgRef,
}: Props) {
  const internalRef = useRef<SVGSVGElement | null>(null)
  const svgRef = externalSvgRef ?? internalRef
  const gRef = useRef<SVGGElement | null>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  const layout = useMemo(() => computeLayout(people), [people])

  const fit = useCallback(() => {
    const svg = svgRef.current
    const behavior = zoomRef.current
    if (!svg || !behavior || !layout.nodes.length) return
    const { width, height } = svg.getBoundingClientRect()
    const w = layout.bounds.maxX - layout.bounds.minX + PADDING * 2
    const h = layout.bounds.maxY - layout.bounds.minY + PADDING * 2
    const k = Math.min(width / w, height / h, 1)
    const cx = (layout.bounds.minX + layout.bounds.maxX) / 2
    const cy = (layout.bounds.minY + layout.bounds.maxY) / 2
    select(svg)
      .transition()
      .duration(300)
      .call(behavior.transform, zoomIdentity.translate(width / 2, height / 2).scale(k).translate(-cx, -cy))
  }, [layout, svgRef])

  useEffect(() => {
    const svg = svgRef.current
    const g = gRef.current
    if (!svg || !g) return
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 2.5])
      .on('zoom', (event) => {
        g.setAttribute('transform', event.transform.toString())
      })
    zoomRef.current = behavior
    select(svg).call(behavior).on('dblclick.zoom', null)
    return () => {
      select(svg).on('.zoom', null)
      zoomRef.current = null
    }
  }, [svgRef])

  // Fit once the first layout is available.
  const fittedRef = useRef(false)
  useEffect(() => {
    if (fittedRef.current || !layout.nodes.length) return
    fittedRef.current = true
    fit()
  }, [layout, fit])

  const centerOn = useCallback(
    (id: string) => {
      const svg = svgRef.current
      const behavior = zoomRef.current
      const node = layout.byId.get(id)
      if (!svg || !behavior || !node) return
      const { width, height } = svg.getBoundingClientRect()
      select(svg)
        .transition()
        .duration(400)
        .call(
          behavior.transform,
          zoomIdentity.translate(width / 2, height / 2).scale(1).translate(-node.x, -node.y),
        )
    },
    [layout, svgRef],
  )

  useEffect(() => {
    if (focusId) centerOn(focusId)
  }, [focusId, centerOn])

  const zoomBy = (factor: number) => {
    const svg = svgRef.current
    const behavior = zoomRef.current
    if (!svg || !behavior) return
    select(svg).transition().duration(200).call(behavior.scaleBy, factor)
  }

  if (!layout.nodes.length) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">{ar.emptyTree}</div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <svg ref={svgRef} className="h-full w-full touch-none" role="tree" aria-label={ar.appTitle}>
        <g ref={gRef}>
          {layout.edges.map((edge) => (
            <polyline
              key={edge.id}
              points={edge.points.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none"
              stroke="var(--color-link)"
              strokeWidth={4}
              strokeLinecap="square"
            />
          ))}
          {layout.nodes.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              selected={node.id === selectedId}
              dim={Boolean(dimUnhighlighted && highlightIds && !highlightIds.has(node.id))}
              highlighted={Boolean(highlightIds?.has(node.id))}
              onSelect={onSelect}
            />
          ))}
        </g>
      </svg>

      <div className="no-print absolute bottom-4 start-4 flex flex-col gap-1 rounded-xl bg-white/90 p-1 shadow-md ring-1 ring-black/5">
        <button className="size-9 rounded-lg text-lg hover:bg-slate-100" onClick={() => zoomBy(1.3)} title={ar.zoomIn} aria-label={ar.zoomIn}>+</button>
        <button className="size-9 rounded-lg text-lg hover:bg-slate-100" onClick={() => zoomBy(1 / 1.3)} title={ar.zoomOut} aria-label={ar.zoomOut}>−</button>
        <button className="size-9 rounded-lg text-sm hover:bg-slate-100" onClick={fit} title={ar.resetView} aria-label={ar.resetView}>⤢</button>
      </div>
    </div>
  )
}

function TreeNode({
  node,
  selected,
  dim,
  highlighted,
  onSelect,
}: {
  node: LayoutNode
  selected: boolean
  dim: boolean
  highlighted: boolean
  onSelect: (id: string) => void
}) {
  const female = node.person.gender === 'female'
  const label = node.person.name || '—'
  const maxChars = node.shape === 'circle' ? 9 : 12
  const shown = label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      role="treeitem"
      tabIndex={0}
      aria-label={node.person.name}
      aria-selected={selected}
      className="cursor-pointer outline-none"
      opacity={dim ? 0.25 : 1}
      onClick={() => onSelect(node.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(node.id)
        }
      }}
    >
      <title>{node.person.fullLineage || node.person.name}</title>
      {node.shape === 'circle' ? (
        <circle
          r={node.w / 2}
          fill="var(--color-female)"
          stroke={selected ? 'var(--color-accent)' : highlighted ? '#b4468a' : 'transparent'}
          strokeWidth={selected ? 5 : 3}
        />
      ) : (
        <rect
          x={-node.w / 2}
          y={-node.h / 2}
          width={node.w}
          height={node.h}
          rx={6}
          fill="var(--color-node)"
          stroke={selected ? 'var(--color-accent)' : highlighted ? '#f0a500' : 'transparent'}
          strokeWidth={selected ? 5 : 3}
        />
      )}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={female ? 19 : 21}
        fontWeight={700}
        fill={female ? 'var(--color-female-ink)' : '#ffffff'}
        style={{ pointerEvents: 'none' }}
      >
        {shown}
      </text>
    </g>
  )
}
