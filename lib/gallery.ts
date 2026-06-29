"use client"

import { useCallback, useSyncExternalStore } from "react"
import type { StickerData } from "@/components/sticker"

export const GALLERY_STORAGE_KEY = "emoji-alchemy:gallery"

export interface GalleryItem {
  id: string
  stickers: StickerData[]
  publishedAt: number
}

// ── Store ──────────────────────────────────────────────────────────────────
// A tiny localStorage-backed store exposed through useSyncExternalStore so the
// gallery reflects publishes immediately and across browser tabs. The snapshot
// is cached and only replaced when the underlying data actually changes, so
// useSyncExternalStore doesn't loop on referentially-unstable reads.

let cache: GalleryItem[] | null = null
const listeners = new Set<() => void>()

function safeRead(): GalleryItem[] {
  if (typeof window === "undefined") return []
  let raw: string | null
  try {
    raw = localStorage.getItem(GALLERY_STORAGE_KEY)
  } catch (err) {
    console.warn("alchemoji: gallery localStorage unavailable", err)
    return []
  }
  if (raw === null) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) throw new Error("stored gallery is not an array")
    return parsed as GalleryItem[]
  } catch (err) {
    console.warn("alchemoji: discarding corrupt gallery", err)
    try {
      localStorage.removeItem(GALLERY_STORAGE_KEY)
    } catch {
      // already logged
    }
    return []
  }
}

function getSnapshot(): GalleryItem[] {
  if (cache === null) cache = safeRead()
  return cache
}

function getServerSnapshot(): GalleryItem[] {
  return EMPTY
}
const EMPTY: GalleryItem[] = []

function emit() {
  for (const l of listeners) l()
}

function write(next: GalleryItem[]) {
  cache = next
  try {
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(next))
  } catch (err) {
    console.warn("alchemoji: failed to persist gallery", err)
  }
  emit()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== GALLERY_STORAGE_KEY) return
    // Another tab changed it (or cleared everything) — drop our cache and notify.
    cache = safeRead()
    emit()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(cb)
    window.removeEventListener("storage", onStorage)
  }
}

// ── Mutations ────────────────────────────────────────────────────────────────

/** Deep-copy stickers into a new frozen snapshot at the front of the gallery. */
export function publishToGallery(stickers: StickerData[]): GalleryItem | null {
  if (stickers.length === 0) return null
  const item: GalleryItem = {
    id: crypto.randomUUID(),
    stickers: stickers.map((s) => ({ ...s })),
    publishedAt: Date.now(),
  }
  write([item, ...getSnapshot()])
  return item
}

export function removeFromGallery(id: string) {
  write(getSnapshot().filter((item) => item.id !== id))
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGallery() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const publish = useCallback((stickers: StickerData[]) => publishToGallery(stickers), [])
  const remove = useCallback((id: string) => removeFromGallery(id), [])
  return { items, publish, remove }
}
