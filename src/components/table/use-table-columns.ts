"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"

import { parseColumns, type TableColumn } from "./columns"

const listeners = new Map<string, Set<() => void>>()

function notify(key: string) {
  for (const listener of listeners.get(key) ?? []) listener()
}

/** Another tab changed one of the stored column lists. */
function onStorage(event: StorageEvent) {
  if (event.key) notify(event.key)
}

function subscribeTo(key: string, listener: () => void) {
  const set = listeners.get(key) ?? new Set()
  listeners.set(key, set)
  set.add(listener)
  if (listeners.size === 1 && set.size === 1) window.addEventListener("storage", onStorage)
  return () => {
    set.delete(listener)
    if (set.size === 0) listeners.delete(key)
    if (listeners.size === 0) window.removeEventListener("storage", onStorage)
  }
}

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    // Storage blocked: the default applies.
    return null
  }
}

/**
 * The columns this browser has chosen for a table, and a setter that remembers
 * them. The server renders `defaults`, so the first paint matches the markup
 * it sent before the stored choice is read.
 *
 * `all` is the whole registry, not just the defaults: a stored list is checked
 * against every column the table can show, or adding one that is hidden by
 * default would be dropped again the moment it was read back.
 */
export function useTableColumns<Key extends string>(
  storageKey: string,
  all: readonly TableColumn<Key>[],
  defaults: readonly Key[],
) {
  const subscribe = useCallback(
    (listener: () => void) => subscribeTo(storageKey, listener),
    [storageKey],
  )
  const stored = useSyncExternalStore(
    subscribe,
    () => read(storageKey),
    () => null,
  )

  const known = useMemo(() => all.map((column) => column.key), [all])
  const columns = useMemo(
    () => parseColumns(stored, known) ?? [...defaults],
    [stored, known, defaults],
  )

  const setColumns = useCallback(
    (next: Key[]) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // Nothing to remember, so the table simply keeps what it has.
      }
      notify(storageKey)
    },
    [storageKey],
  )

  return { columns, setColumns }
}
