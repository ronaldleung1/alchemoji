"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const HISTORY_LIMIT = 100

export interface History<T> {
  commit: () => void
  undo: () => T | null
  redo: () => T | null
  canUndo: boolean
  canRedo: boolean
}

/**
 * Snapshot-based undo/redo for an immutable state value.
 * Stash the getter in a ref so commit/undo/redo stay referentially stable
 * across renders even when the caller passes an inline arrow each render.
 */
export function useHistory<T>(getCurrent: () => T): History<T> {
  const pastRef = useRef<T[]>([])
  const futureRef = useRef<T[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const getCurrentRef = useRef(getCurrent)
  useEffect(() => {
    getCurrentRef.current = getCurrent
  }, [getCurrent])

  const sync = useCallback(() => {
    setCanUndo(pastRef.current.length > 0)
    setCanRedo(futureRef.current.length > 0)
  }, [])

  const commit = useCallback(() => {
    const past = pastRef.current
    past.push(getCurrentRef.current())
    if (past.length > HISTORY_LIMIT) past.shift()
    futureRef.current = []
    sync()
  }, [sync])

  const undo = useCallback((): T | null => {
    const past = pastRef.current
    if (past.length === 0) return null
    const prev = past.pop()!
    futureRef.current.push(getCurrentRef.current())
    sync()
    return prev
  }, [sync])

  const redo = useCallback((): T | null => {
    const future = futureRef.current
    if (future.length === 0) return null
    const next = future.pop()!
    pastRef.current.push(getCurrentRef.current())
    sync()
    return next
  }, [sync])

  return { commit, undo, redo, canUndo, canRedo }
}

/**
 * Bind Cmd/Ctrl+Z (undo) and Cmd/Ctrl+Shift+Z / Cmd/Ctrl+Y (redo).
 * Skips when focus is inside an input, textarea, or contenteditable.
 */
export function useUndoRedoShortcuts(onUndo: () => void, onRedo: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return
      const key = e.key.toLowerCase()
      if (key !== "z" && key !== "y") return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName.toLowerCase()
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return
      e.preventDefault()
      if (key === "y" || (key === "z" && e.shiftKey)) onRedo()
      else onUndo()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onUndo, onRedo])
}
