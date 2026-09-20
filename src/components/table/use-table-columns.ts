"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"

import { parseColumns } from "./columns"

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
 */
export function useTableColumns<Key extends string>(
  storageKey: string,
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

  const columns = useMemo(
    () => parseColumns(stored, defaults) ?? [...defaults],
    [stored, defaults],
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
