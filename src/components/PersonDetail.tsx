import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useState } from 'react'
import { ar, num } from '../i18n/ar'
import { childrenOf } from '../model/select'
import type { Person } from '../model/types'

interface Props {
  people: Record<string, Person>
  personId?: string
  onClose: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string, gender: 'male' | 'female') => void
  onAddSpouse: (personId: string) => void
  onCenter: (id: string) => void
}

export default function PersonDetail({
  people,
  personId,
  onClose,
  onEdit,
  onDelete,
  onAddChild,
  onAddSpouse,
  onCenter,
}: Props) {
  // Navigating parent → child inside the sheet keeps a back stack, matching
  // the ← / ✕ pair in the header.
  const [stack, setStack] = useState<string[]>([])
  useEffect(() => {
    setStack([])
  }, [personId])

  const currentId = stack.at(-1) ?? personId
  const person = currentId ? people[currentId] : undefined
  const open = Boolean(person)

  const goto = (id: string) => setStack((s) => [...s, id])
  const back = () => setStack((s) => s.slice(0, -1))

  const requestClose = () => {
    if (stack.length) back()
    else onClose()
  }

  if (!person || !currentId) return null

  const father = person.fatherId ? people[person.fatherId] : undefined
  const mother = person.motherId ? people[person.motherId] : undefined
  const spouses = person.spouseIds.map((id) => people[id]).filter(Boolean)
  const kids = childrenOf(people, person.id)

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && requestClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          dir="rtl"
          aria-describedby={undefined}
          className="fixed inset-y-0 start-0 z-50 flex w-full flex-col bg-[#fbfaf6] shadow-2xl focus:outline-none sm:inset-y-3 sm:start-3 sm:w-[26rem] sm:rounded-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:rounded-t-2xl">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-[var(--color-accent)]" aria-hidden />
              <Dialog.Title className="font-bold">{person.branch || ar.root}</Dialog.Title>
            </div>
            <div className="flex items-center gap-1">
              {stack.length > 0 && (
                <button
                  onClick={back}
                  aria-label={ar.back}
                  className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100"
                >
                  ←
                </button>
              )}
              <button
                onClick={onClose}
                aria-label={ar.close}
                className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <article className="rounded-2xl bg-[var(--color-node-soft)] p-4 ring-1 ring-[var(--color-node)]/25">
              <div className="flex items-start gap-3">
                <Avatar person={person} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold text-[var(--color-node)]">{person.name}</h2>
                  {person.fullLineage && (
                    <p className="mt-1 text-sm leading-6 text-slate-700">{person.fullLineage}</p>
                  )}
                  {person.bio && (
                    <p className="mt-2 text-sm leading-6 text-slate-600">{person.bio}</p>
                  )}
                  <p className="mt-3 text-sm font-bold text-[var(--color-node)]">
                    ⚇ {person.gender === 'female' ? ar.female : ar.male}
                    {(person.birthYear || person.deathYear) && (
                      <span className="ms-2 font-normal text-slate-500">
                        {person.birthYear ?? '—'} – {person.deathYear ?? ''}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </article>

            <Field label={ar.occupation}>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-600">
                {person.occupation?.trim() || ar.unspecified}
              </div>
            </Field>

            <Field label={ar.branch}>
              <p className="text-lg font-bold text-[var(--color-accent)]">
                {person.branch || ar.root}
              </p>
            </Field>

            <Field label={ar.parents}>
              {father || mother ? (
                <ul className="space-y-1">
                  {father && <RelationRow person={father} role={ar.father} onClick={goto} />}
                  {mother && <RelationRow person={mother} role={ar.mother} onClick={goto} />}
                </ul>
              ) : (
                <p className="text-slate-400">{ar.none}</p>
              )}
            </Field>

            {spouses.length > 0 && (
              <Field label={ar.spouses}>
                <ul className="space-y-1">
                  {spouses.map((s) => (
                    <RelationRow key={s.id} person={s} onClick={goto} />
                  ))}
                </ul>
              </Field>
            )}

            <Field label={ar.children(num(kids.length))}>
              {kids.length ? (
                <ul className="space-y-1">
                  {kids.map((c) => (
                    <RelationRow key={c.id} person={c} onClick={goto} />
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400">{ar.none}</p>
              )}
            </Field>

            {person.notes && (
              <Field label={ar.notes}>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {person.notes}
                </p>
              </Field>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:rounded-b-2xl">
            <button className={btn} onClick={() => onAddChild(person.id, 'male')}>
              {ar.addSon}
            </button>
            <button className={btn} onClick={() => onAddChild(person.id, 'female')}>
              {ar.addDaughter}
            </button>
            <button className={btn} onClick={() => onAddSpouse(person.id)}>
              {ar.addSpouse}
            </button>
            <button className={btn} onClick={() => onCenter(person.id)}>
              {ar.centerOnPerson}
            </button>
            <span className="flex-1" />
            <button className={btn} onClick={() => onEdit(person.id)}>
              {ar.edit}
            </button>
            <button
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              onClick={() => onDelete(person.id)}
            >
              {ar.remove}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const btn =
  'rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-1.5 text-sm text-slate-500">{label}</h3>
      {children}
    </section>
  )
}

function RelationRow({
  person,
  role,
  onClick,
}: {
  person: Person
  role?: string
  onClick: (id: string) => void
}) {
  return (
    <li>
      <button
        onClick={() => onClick(person.id)}
        className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-start ring-1 ring-slate-200 hover:bg-slate-50"
      >
        <span className="font-bold">
          {person.name}
          {role && <span className="ms-1 text-sm font-normal text-slate-500">({role})</span>}
        </span>
        <span aria-hidden className="text-slate-400">
          {person.gender === 'female' ? '○' : '□'}
        </span>
      </button>
    </li>
  )
}

function Avatar({ person }: { person: Person }) {
  if (person.photoDataUrl) {
    return (
      <img
        src={person.photoDataUrl}
        alt=""
        className="size-20 shrink-0 rounded-full object-cover ring-4 ring-slate-300"
      />
    )
  }
  return (
    <div
      aria-hidden
      className="flex size-20 shrink-0 items-center justify-center rounded-full bg-slate-200 text-3xl text-slate-400 ring-4 ring-slate-300"
    >
      ☻
    </div>
  )
}
