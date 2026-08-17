import { useEffect, useMemo, useRef, useState } from 'react'
import { ar, num } from '../i18n/ar'
import { searchPeople } from '../lib/search'
import type { Person } from '../model/types'

interface Props {
  title: string
  people: Record<string, Person>
  branches: string[]
  branch: string
  onBranchChange: (branch: string) => void
  query: string
  onQueryChange: (query: string) => void
  onPick: (id: string) => void
  onAdd: () => void
  onExportJson: () => void
  onImportJson: (file: File) => void
  onExportPng: () => void
  onReset: () => void
}

export default function Header({
  title,
  people,
  branches,
  branch,
  onBranchChange,
  query,
  onQueryChange,
  onPick,
  onAdd,
  onExportJson,
  onImportJson,
  onExportPng,
  onReset,
}: Props) {
  const [focused, setFocused] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const toolsRef = useRef<HTMLDivElement | null>(null)
  const results = useMemo(() => searchPeople(people, query), [people, query])
  const count = Object.keys(people).length

  // The tools menu only exists on phones, where a tap outside is the natural
  // way to dismiss it.
  useEffect(() => {
    if (!toolsOpen) return
    const onDown = (event: PointerEvent) => {
      if (!toolsRef.current?.contains(event.target as Node)) setToolsOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [toolsOpen])

  const close = () => setToolsOpen(false)
  const tools = (
    <>
      <ToolButton close={close} onClick={onExportJson}>
        {ar.exportJson}
      </ToolButton>
      <label className={`${chip} cursor-pointer`}>
        {ar.importJson}
        <input
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            close()
            if (file) onImportJson(file)
          }}
        />
      </label>
      <ToolButton close={close} onClick={onExportPng}>
        {ar.exportPng}
      </ToolButton>
      <ToolButton close={close} onClick={() => window.print()}>
        {ar.print}
      </ToolButton>
      <ToolButton close={close} onClick={onReset}>
        {ar.resetData}
      </ToolButton>
    </>
  )

  return (
    <header className="no-print z-20 border-b border-slate-200 bg-white/95 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur sm:px-4 sm:py-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-[var(--color-accent)] sm:text-2xl">
              {title}
            </h1>
            <p className="text-xs text-slate-500 sm:text-sm">{ar.members(num(count))}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onAdd}
              className="min-h-11 rounded-lg bg-[var(--color-node)] px-4 py-2 text-white active:opacity-80 sm:hover:opacity-90"
            >
              + {ar.add}
            </button>

            {/* phones: everything else folds into one menu */}
            <div ref={toolsRef} className="relative sm:hidden">
              <button
                onClick={() => setToolsOpen((open) => !open)}
                aria-label={ar.tools}
                aria-expanded={toolsOpen}
                className="min-h-11 min-w-11 rounded-lg border border-slate-200 px-3 text-lg leading-none text-slate-700 active:bg-slate-100"
              >
                ⋯
              </button>
              {toolsOpen && (
                <div className="absolute end-0 top-full z-40 mt-1 flex w-56 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  {tools}
                </div>
              )}
            </div>

            {/* tablets and up: the same actions, laid out inline */}
            <div className="hidden flex-wrap items-center gap-2 sm:flex">{tools}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 150)}
              placeholder={ar.searchPlaceholder}
              aria-label={ar.searchPlaceholder}
              type="search"
              enterKeyHint="search"
              autoCapitalize="off"
              autoCorrect="off"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-lg outline-none focus:border-[var(--color-node)] sm:py-3"
            />
            {focused && query.trim() && (
              <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white shadow-lg">
                {results.length === 0 && (
                  <li className="px-4 py-3 text-slate-400">{ar.noResults}</li>
                )}
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onPick(p.id)}
                      className="block w-full px-4 py-3 text-start active:bg-slate-100 sm:py-2 sm:hover:bg-slate-50"
                    >
                      <span className="font-bold">{p.name}</span>
                      {p.fullLineage && (
                        <span className="ms-2 text-sm text-slate-500">{p.fullLineage}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <select
            value={branch}
            onChange={(e) => onBranchChange(e.target.value)}
            aria-label={ar.branch}
            className="max-w-[8rem] shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 outline-none sm:max-w-none sm:py-3"
          >
            <option value="">{ar.allBranches}</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  )
}

function ToolButton({
  onClick,
  close,
  children,
}: {
  onClick: () => void
  close: () => void
  children: React.ReactNode
}) {
  return (
    <button
      className={chip}
      onClick={() => {
        close()
        onClick()
      }}
    >
      {children}
    </button>
  )
}

const chip =
  'flex min-h-11 items-center rounded-lg border border-slate-200 px-3 text-sm text-slate-700 active:bg-slate-100 sm:min-h-0 sm:py-2 sm:hover:bg-slate-100'
