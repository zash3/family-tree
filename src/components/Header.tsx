import { useMemo, useState } from 'react'
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
  const results = useMemo(() => searchPeople(people, query), [people, query])
  const count = Object.keys(people).length

  return (
    <header className="no-print z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-accent)]">{title}</h1>
            <p className="text-sm text-slate-500">{ar.members(num(count))}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onAdd}
              className="rounded-lg bg-[var(--color-node)] px-4 py-2 text-white hover:opacity-90"
            >
              + {ar.add}
            </button>
            <button className={chip} onClick={onExportJson}>{ar.exportJson}</button>
            <label className={`${chip} cursor-pointer`}>
              {ar.importJson}
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) onImportJson(file)
                }}
              />
            </label>
            <button className={chip} onClick={onExportPng}>{ar.exportPng}</button>
            <button className={chip} onClick={() => window.print()}>{ar.print}</button>
            <button className={chip} onClick={onReset}>{ar.resetData}</button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 150)}
              placeholder={ar.searchPlaceholder}
              aria-label={ar.searchPlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-lg outline-none focus:border-[var(--color-node)]"
            />
            {focused && query.trim() && (
              <ul className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {results.length === 0 && (
                  <li className="px-4 py-3 text-slate-400">{ar.noResults}</li>
                )}
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onPick(p.id)}
                      className="block w-full px-4 py-2 text-start hover:bg-slate-50"
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
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none"
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

const chip = 'rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100'
