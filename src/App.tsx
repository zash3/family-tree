import { useMemo, useRef, useState } from 'react'
import Header from './components/Header'
import PersonDetail from './components/PersonDetail'
import PersonForm from './components/PersonForm'
import { draftFrom, type FormDraft } from './components/personDraft'
import TreeView from './components/TreeView'
import { ar } from './i18n/ar'
import { download, svgToPngBlob } from './lib/exportPng'
import { matchesQuery } from './lib/search'
import { branchesOf } from './model/select'
import { ValidationError } from './model/validate'
import type { Gender } from './model/types'
import { useTreeStore } from './store/treeStore'

export default function App() {
  const doc = useTreeStore((s) => s.doc)
  const addPerson = useTreeStore((s) => s.addPerson)
  const updatePerson = useTreeStore((s) => s.updatePerson)
  const deletePerson = useTreeStore((s) => s.deletePerson)
  const linkSpouse = useTreeStore((s) => s.linkSpouse)
  const unlinkSpouse = useTreeStore((s) => s.unlinkSpouse)
  const importDoc = useTreeStore((s) => s.importDoc)
  const resetToSeed = useTreeStore((s) => s.resetToSeed)

  const people = doc.people
  const svgRef = useRef<SVGSVGElement | null>(null)

  const [query, setQuery] = useState('')
  const [branch, setBranch] = useState('')
  const [selectedId, setSelectedId] = useState<string>()
  const [focusId, setFocusId] = useState<string>()
  const [form, setForm] = useState<FormDraft>()
  const [formError, setFormError] = useState<string>()

  const highlightIds = useMemo(() => {
    const q = query.trim()
    if (!q && !branch) return undefined
    const ids = new Set<string>()
    for (const p of Object.values(people)) {
      const okQuery = !q || matchesQuery(p, q)
      const okBranch = !branch || p.branch === branch
      if (okQuery && okBranch) ids.add(p.id)
    }
    return ids
  }, [people, query, branch])

  const center = (id: string) => {
    // re-trigger even when the same node is picked twice
    setFocusId(undefined)
    requestAnimationFrame(() => setFocusId(id))
  }

  const openPerson = (id: string) => {
    setSelectedId(id)
    center(id)
  }

  const submitForm = (draft: FormDraft) => {
    const payload = {
      name: draft.name.trim(),
      gender: draft.gender,
      fullLineage: draft.fullLineage.trim() || undefined,
      bio: draft.bio.trim() || undefined,
      occupation: draft.occupation.trim() || undefined,
      branch: draft.branch.trim() || undefined,
      birthYear: draft.birthYear.trim() || undefined,
      deathYear: draft.deathYear.trim() || undefined,
      notes: draft.notes.trim() || undefined,
      fatherId: draft.fatherId || undefined,
      motherId: draft.motherId || undefined,
      photoDataUrl: draft.photoDataUrl,
    }
    try {
      if (draft.id) {
        const previous = people[draft.id]
        updatePerson(draft.id, payload)
        // reconcile the single-spouse picker with the stored list
        const before = previous?.spouseIds[0]
        if (before && before !== draft.spouseId) unlinkSpouse(draft.id, before)
        if (draft.spouseId) linkSpouse(draft.id, draft.spouseId)
        // reopen the detail sheet so the edit is visible straight away
        setSelectedId(draft.id)
      } else {
        const id = addPerson({ ...payload, spouseIds: [] })
        if (draft.spouseId) linkSpouse(id, draft.spouseId)
        setSelectedId(id)
        center(id)
      }
      setForm(undefined)
      setFormError(undefined)
    } catch (error) {
      setFormError(error instanceof ValidationError ? error.message : String(error))
    }
  }

  const addChild = (parentId: string, gender: Gender) => {
    const parent = people[parentId]
    if (!parent) return
    const spouse = parent.spouseIds.map((id) => people[id]).find(Boolean)
    const father = parent.gender === 'male' ? parent : spouse?.gender === 'male' ? spouse : undefined
    const mother =
      parent.gender === 'female' ? parent : spouse?.gender === 'female' ? spouse : undefined
    setSelectedId(undefined)
    setForm(
      draftFrom(undefined, {
        gender,
        branch: parent.branch ?? '',
        fatherId: father?.id ?? '',
        motherId: mother?.id ?? '',
      }),
    )
  }

  const addSpouse = (personId: string) => {
    const person = people[personId]
    if (!person) return
    setSelectedId(undefined)
    setForm(
      draftFrom(undefined, {
        gender: person.gender === 'male' ? 'female' : 'male',
        branch: person.branch ?? '',
        spouseId: personId,
      }),
    )
  }

  const remove = (id: string) => {
    const person = people[id]
    if (!person) return
    if (!window.confirm(ar.confirmDelete(person.name))) return
    deletePerson(id)
    setSelectedId(undefined)
  }

  const exportJson = () => {
    download(
      new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }),
      'family-tree.json',
    )
  }

  const importJson = async (file: File) => {
    if (!window.confirm(ar.confirmImport)) return
    try {
      importDoc(JSON.parse(await file.text()))
      setSelectedId(undefined)
    } catch (error) {
      window.alert(error instanceof ValidationError ? error.message : ar.errBadFile)
    }
  }

  const exportPng = async () => {
    if (!svgRef.current) return
    try {
      download(await svgToPngBlob(svgRef.current), 'family-tree.png')
    } catch {
      window.alert(ar.errExportPng)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Header
        title={doc.title}
        people={people}
        branches={branchesOf(people)}
        branch={branch}
        onBranchChange={setBranch}
        query={query}
        onQueryChange={setQuery}
        onPick={openPerson}
        onAdd={() => setForm(draftFrom())}
        onExportJson={exportJson}
        onImportJson={importJson}
        onExportPng={exportPng}
        onReset={() => {
          if (window.confirm(ar.confirmReset)) {
            resetToSeed()
            setSelectedId(undefined)
          }
        }}
      />

      <main className="min-h-0 flex-1">
        <TreeView
          people={people}
          selectedId={selectedId}
          highlightIds={highlightIds}
          dimUnhighlighted={Boolean(highlightIds)}
          focusId={focusId}
          onSelect={openPerson}
          svgRef={svgRef}
        />
      </main>

      <PersonDetail
        people={people}
        personId={selectedId}
        onClose={() => setSelectedId(undefined)}
        onEdit={(id) => {
          setSelectedId(undefined)
          setForm(draftFrom(people[id]))
        }}
        onDelete={remove}
        onAddChild={addChild}
        onAddSpouse={addSpouse}
        onCenter={center}
      />

      {form && (
        <PersonForm
          open
          initial={form}
          people={people}
          error={formError}
          onSubmit={submitForm}
          onClose={() => {
            setForm(undefined)
            setFormError(undefined)
          }}
        />
      )}
    </div>
  )
}
