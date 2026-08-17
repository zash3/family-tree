import { useMemo, useState } from 'react'
import Modal from './Modal'
import { ar } from '../i18n/ar'
import { normalizeArabic } from '../lib/search'
import { MAX_PHOTO_BYTES, type Gender, type Person } from '../model/types'
import type { FormDraft } from './personDraft'

interface Props {
  open: boolean
  initial: FormDraft
  people: Record<string, Person>
  error?: string
  onSubmit: (draft: FormDraft) => void
  onClose: () => void
}

export default function PersonForm({ open, initial, people, error, onSubmit, onClose }: Props) {
  const [draft, setDraft] = useState<FormDraft>(initial)
  const [dirty, setDirty] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [localError, setLocalError] = useState<string>()
  const [key, setKey] = useState(0)

  // Re-seed when the caller opens the form on a different person.
  const initialKey = `${initial.id ?? 'new'}:${initial.fatherId}:${initial.motherId}:${initial.spouseId}:${initial.gender}`
  const [seenKey, setSeenKey] = useState(initialKey)
  if (seenKey !== initialKey) {
    setSeenKey(initialKey)
    setDraft(initial)
    setDirty(false)
    setConfirming(false)
    setLocalError(undefined)
    setKey((k) => k + 1)
  }

  const set = <K extends keyof FormDraft>(field: K, value: FormDraft[K]) => {
    setDirty(true)
    setLocalError(undefined)
    setDraft((d) => ({ ...d, [field]: value }))
  }

  const males = usePeopleOptions(people, 'male', draft.id)
  const females = usePeopleOptions(people, 'female', draft.id)
  const spouseOptions = draft.gender === 'male' ? females : males

  const requestClose = () => {
    if (dirty) setConfirming(true)
    else onClose()
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.name.trim()) {
      setLocalError(ar.errNameRequired)
      return
    }
    onSubmit(draft)
  }

  const onPhoto = async (file?: File) => {
    if (!file) return
    if (file.size > MAX_PHOTO_BYTES) {
      setLocalError(ar.errPhotoTooBig)
      return
    }
    const reader = new FileReader()
    reader.onload = () => set('photoDataUrl', String(reader.result))
    reader.readAsDataURL(file)
  }

  return (
    <Modal
      open={open}
      onRequestClose={requestClose}
      title={draft.id ? ar.edit : ar.add}
      wide
    >
      <form key={key} onSubmit={submit} className="space-y-4">
        <Row label={ar.name}>
          <input
            className={input}
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            autoFocus
            required
          />
        </Row>

        <Row label={ar.gender}>
          <div className="flex gap-2">
            {(['male', 'female'] as const).map((g) => (
              <button
                type="button"
                key={g}
                onClick={() => set('gender', g)}
                className={`rounded-lg px-4 py-2 text-sm ring-1 ${
                  draft.gender === g
                    ? 'bg-[var(--color-node)] text-white ring-[var(--color-node)]'
                    : 'bg-white text-slate-600 ring-slate-200'
                }`}
              >
                {g === 'male' ? ar.male : ar.female}
              </button>
            ))}
          </div>
        </Row>

        <Row label={ar.lineage}>
          <textarea
            className={input}
            rows={2}
            value={draft.fullLineage}
            onChange={(e) => set('fullLineage', e.target.value)}
          />
        </Row>

        <Row label={ar.bio}>
          <textarea
            className={input}
            rows={3}
            value={draft.bio}
            onChange={(e) => set('bio', e.target.value)}
          />
        </Row>

        <div className="grid grid-cols-2 gap-3">
          <Row label={ar.occupation}>
            <input
              className={input}
              value={draft.occupation}
              onChange={(e) => set('occupation', e.target.value)}
            />
          </Row>
          <Row label={ar.branch}>
            <input
              className={input}
              value={draft.branch}
              onChange={(e) => set('branch', e.target.value)}
            />
          </Row>
          <Row label={ar.birthYear}>
            <input
              className={input}
              inputMode="numeric"
              value={draft.birthYear}
              onChange={(e) => set('birthYear', e.target.value)}
            />
          </Row>
          <Row label={ar.deathYear}>
            <input
              className={input}
              inputMode="numeric"
              value={draft.deathYear}
              onChange={(e) => set('deathYear', e.target.value)}
            />
          </Row>
        </div>

        <Row label={ar.father}>
          <PersonPicker
            options={males}
            value={draft.fatherId}
            onChange={(v) => set('fatherId', v)}
          />
        </Row>
        <Row label={ar.mother}>
          <PersonPicker
            options={females}
            value={draft.motherId}
            onChange={(v) => set('motherId', v)}
          />
        </Row>
        <Row label={ar.spouses}>
          <PersonPicker
            options={spouseOptions}
            value={draft.spouseId}
            onChange={(v) => set('spouseId', v)}
          />
        </Row>

        <Row label={ar.photo}>
          <div className="flex items-center gap-3">
            {draft.photoDataUrl && (
              <img src={draft.photoDataUrl} alt="" className="size-12 rounded-full object-cover" />
            )}
            <input
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
            {draft.photoDataUrl && (
              <button
                type="button"
                className="text-sm text-red-600"
                onClick={() => set('photoDataUrl', undefined)}
              >
                {ar.remove}
              </button>
            )}
          </div>
        </Row>

        <Row label={ar.notes}>
          <textarea
            className={input}
            rows={2}
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Row>

        {(localError || error) && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {localError || error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={ghost} onClick={requestClose}>
            {ar.cancel}
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[var(--color-node)] px-5 py-2 text-white hover:opacity-90"
          >
            {ar.save}
          </button>
        </div>
      </form>

      {confirming && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="mb-2 text-sm">{ar.confirmDiscard}</p>
          <div className="flex gap-2">
            <button className={ghost} onClick={() => setConfirming(false)}>
              {ar.keepEditing}
            </button>
            <button
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white"
              onClick={onClose}
            >
              {ar.discard}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

const input =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-[var(--color-node)]'
const ghost = 'rounded-lg border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-100'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function usePeopleOptions(people: Record<string, Person>, gender: Gender, excludeId?: string) {
  return useMemo(
    () =>
      Object.values(people)
        .filter((p) => p.gender === gender && p.id !== excludeId)
        .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [people, gender, excludeId],
  )
}

/** A filterable select — usable with thousands of people without a heavy combobox. */
function PersonPicker({
  options,
  value,
  onChange,
}: {
  options: Person[]
  value: string
  onChange: (id: string) => void
}) {
  const [filter, setFilter] = useState('')
  const shown = useMemo(() => {
    const q = normalizeArabic(filter)
    const list = q
      ? options.filter((p) =>
          normalizeArabic(`${p.name} ${p.fullLineage ?? ''}`).includes(q),
        )
      : options
    const head = list.slice(0, 300)
    // keep the current selection reachable even when filtered out
    const selected = options.find((p) => p.id === value)
    return selected && !head.some((p) => p.id === value) ? [selected, ...head] : head
  }, [options, filter, value])

  return (
    <div className="flex gap-2">
      <input
        className={`${input} w-2/5`}
        placeholder={ar.searchPlaceholder}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <select
        className={`${input} flex-1`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{ar.none}</option>
        {shown.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.fullLineage ? ` — ${p.fullLineage.slice(0, 40)}` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
