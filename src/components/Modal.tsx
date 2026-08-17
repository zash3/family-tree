import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'
import { ar } from '../i18n/ar'

interface Props {
  open: boolean
  /** called for incidental dismissal (Esc, click outside) and the X button */
  onRequestClose: () => void
  title: string
  /** visually hide the title but keep it for screen readers */
  hideTitle?: boolean
  header?: ReactNode
  children: ReactNode
  wide?: boolean
}

/**
 * Every dismissible modal routes Esc and click-outside through one
 * `onRequestClose`, so a dirty form can intercept both in a single place.
 */
export default function Modal({
  open,
  onRequestClose,
  title,
  hideTitle,
  header,
  children,
  wide,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onRequestClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          dir="rtl"
          aria-describedby={undefined}
          className={`fixed inset-y-0 start-0 z-50 flex w-full flex-col bg-[#fbfaf6] shadow-2xl focus:outline-none sm:inset-y-3 sm:start-3 sm:rounded-2xl ${
            wide ? 'sm:w-[34rem]' : 'sm:w-[26rem]'
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 sm:rounded-t-2xl">
            <div className="min-w-0 flex-1">
              {header ?? (
                <Dialog.Title className={hideTitle ? 'sr-only' : 'truncate font-bold'}>
                  {title}
                </Dialog.Title>
              )}
              {header ? <Dialog.Title className="sr-only">{title}</Dialog.Title> : null}
            </div>
            <button
              type="button"
              onClick={onRequestClose}
              aria-label={ar.close}
              className="shrink-0 rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
