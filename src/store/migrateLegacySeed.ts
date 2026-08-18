import { seedDoc } from '../data/seed'
import type { Person, TreeDoc } from '../model/types'

/**
 * The first release shipped an example tree carrying a real family's names.
 * The repository is public now, so that example was replaced — but the seed
 * only ever applies to a first run, which leaves the old names sitting in the
 * saved copy of every browser that had already opened the app.
 *
 * This migration clears them out, without throwing away anyone's real work.
 */
/**
 * The retired example named its rows after its people (`p-<name>`); the current
 * one numbers them (`p-1`) and anything the user adds gets a UUID. Matching on
 * that shape identifies the old rows without naming them here.
 */
const LEGACY_ID = /^p-[a-z]+(-\d+)?$/

export const LEGACY_BACKUP_KEY = 'family-tree/backup-legacy-seed'

/**
 * A document is "still the old example" when every person in it came from that
 * example — nobody new was added. Renaming or deleting some of them still
 * counts, since what is left is old example data either way.
 *
 * A document containing anyone else is the user's own tree built on top of the
 * example, and is left completely alone: silently deleting real work would be
 * worse than showing a name they can edit.
 */
export function isLegacySeedDoc(doc: TreeDoc | undefined): boolean {
  const ids = Object.keys(doc?.people ?? {})
  return ids.length > 0 && ids.every((id) => LEGACY_ID.test(id))
}

/**
 * Replace the old example with the current one. The discarded document is kept
 * under a separate key so an edit made to it is recoverable, not destroyed.
 */
export function migrateLegacySeed(persisted: unknown): { doc: TreeDoc } {
  const state = (persisted ?? {}) as { doc?: TreeDoc }
  if (!isLegacySeedDoc(state.doc)) {
    return { doc: state.doc ?? seedDoc() }
  }
  try {
    globalThis.localStorage?.setItem(LEGACY_BACKUP_KEY, JSON.stringify(state.doc))
  } catch {
    // A full or unavailable storage must not block the migration.
  }
  return { doc: seedDoc() }
}

export type { Person }
