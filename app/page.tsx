"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { StickerCanvas } from "@/components/sticker-canvas"
import { AddCanvasButton } from "@/components/add-canvas-button"
import { EmojiTray } from "@/components/emoji-tray"
import { TopBar } from "@/components/top-bar"
import { ZoomControls, ZOOM_DEFAULT, nextZoom, prevZoom } from "@/components/zoom-controls"
import type { StickerData } from "@/components/sticker"
import { haptic } from "@/lib/haptics"
import { useHistory, useUndoRedoShortcuts } from "@/lib/use-history"

const STORAGE_KEY = "emoji-alchemy:canvases"

interface CanvasData {
  id: string
  stickers: StickerData[]
}

interface Selection {
  canvasId: string
  stickerId: string
}

function newCanvas(): CanvasData {
  return { id: crypto.randomUUID(), stickers: [] }
}

function nextZIndex(stickers: StickerData[]) {
  return stickers.reduce((m, s) => Math.max(m, s.zIndex ?? 0), 0) + 1
}

export default function Page() {
  const [canvases, setCanvases] = useState<CanvasData[]>([])
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [zoom, setZoom] = useState(ZOOM_DEFAULT)
  const writeFailedRef = useRef(false)

  // Mirror canvases into a ref so history callbacks stay stable without
  // rebinding on every state change.
  const canvasesRef = useRef<CanvasData[]>([])
  useEffect(() => { canvasesRef.current = canvases }, [canvases])
  const { commit, undo, redo, canUndo, canRedo } = useHistory<CanvasData[]>(
    () => canvasesRef.current
  )

  const handleUndo = useCallback(() => {
    const prev = undo()
    if (prev === null) return
    haptic("light")
    setCanvases(prev)
    setSelection(null)
    setActiveCanvasId((active) =>
      prev.some((c) => c.id === active) ? active : prev[0]?.id ?? null
    )
  }, [undo])

  const handleRedo = useCallback(() => {
    const next = redo()
    if (next === null) return
    haptic("light")
    setCanvases(next)
    setSelection(null)
    setActiveCanvasId((active) =>
      next.some((c) => c.id === active) ? active : next[0]?.id ?? null
    )
  }, [redo])

  useUndoRedoShortcuts(handleUndo, handleRedo)

  const seed = useCallback((list: CanvasData[]) => {
    const safe = list.length > 0 ? list : [newCanvas()]
    setCanvases(safe)
    setActiveCanvasId(safe[0].id)
  }, [])

  useEffect(() => {
    let raw: string | null = null
    try {
      raw = localStorage.getItem(STORAGE_KEY)
    } catch (err) {
      console.warn("emoji-alchemy: localStorage unavailable, starting empty", err)
      seed([])
      setHydrated(true)
      return
    }

    if (raw === null) {
      seed([])
    } else {
      try {
        const parsed = JSON.parse(raw) as CanvasData[]
        if (!Array.isArray(parsed)) throw new Error("stored value is not an array")
        seed(parsed)
      } catch (err) {
        console.warn("emoji-alchemy: discarding corrupt saved canvases", err)
        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch {
          // already logged above
        }
        seed([])
      }
    }
    setHydrated(true)
  }, [seed])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(canvases))
      writeFailedRef.current = false
    } catch (err) {
      if (!writeFailedRef.current) {
        writeFailedRef.current = true
        console.warn("emoji-alchemy: failed to persist canvases", err)
      }
    }
  }, [canvases, hydrated])

  const updateCanvasStickers = useCallback(
    (canvasId: string, updater: (prev: StickerData[]) => StickerData[]) => {
      setCanvases((prev) =>
        prev.map((c) => (c.id === canvasId ? { ...c, stickers: updater(c.stickers) } : c))
      )
    },
    []
  )

  const addCanvas = useCallback(() => {
    haptic("light")
    commit()
    const c = newCanvas()
    setCanvases((prev) => [...prev, c])
    setActiveCanvasId(c.id)
  }, [commit])

  const duplicateCanvas = useCallback(
    (canvasId: string) => {
      haptic("light")
      commit()
      let dupId: string | null = null
      setCanvases((prev) => {
        const idx = prev.findIndex((c) => c.id === canvasId)
        if (idx === -1) return prev
        const src = prev[idx]
        const copy: CanvasData = {
          id: crypto.randomUUID(),
          stickers: src.stickers.map((s) => ({ ...s, id: crypto.randomUUID() })),
        }
        dupId = copy.id
        return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]
      })
      if (dupId) setActiveCanvasId(dupId)
    },
    [commit]
  )

  const deleteCanvas = useCallback((canvasId: string) => {
    haptic("error")
    commit()
    setCanvases((prev) => {
      const idx = prev.findIndex((c) => c.id === canvasId)
      const next = prev.filter((c) => c.id !== canvasId)
      setActiveCanvasId((active) => {
        if (active !== canvasId) return active
        const predecessor = prev[idx - 1]
        return (predecessor ?? next[0])?.id ?? null
      })
      return next
    })
    setSelection((prev) => (prev?.canvasId === canvasId ? null : prev))
  }, [commit])

  const selectSticker = useCallback((canvasId: string, stickerId: string | null) => {
    setSelection(stickerId == null ? null : { canvasId, stickerId })
  }, [])

  // Smooth-scroll the active canvas into view within its scroll container
  // (the canvas panel above the emoji tray). `block: "nearest"` is a no-op
  // when the canvas is already fully visible.
  useEffect(() => {
    if (!activeCanvasId) return
    const el = document.querySelector<HTMLElement>(
      `[data-canvas-id="${activeCanvasId}"]`
    )
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [activeCanvasId])

  // Global deselect: any pointerdown whose target isn't inside a sticker
  // clears the current selection — including clicks on the search bar, tray,
  // canvas background, or anywhere off-page. Target check (not stopPropagation
  // reliance) so it's robust to React's event-delegation ordering.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (target?.closest("[data-sticker]")) return
      setSelection(null)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [])

  // Backspace/Delete removes the selected sticker.
  // Arrow keys nudge it by 1px (Shift = 10px).
  // Both skip when focus is in a text input.
  // Arrow-key bursts within NUDGE_COALESCE_MS share one history entry so
  // holding a key down doesn't flood the undo stack.
  useEffect(() => {
    if (!selection) return
    const NUDGE_COALESCE_MS = 500
    let lastNudgeAt = 0

    const isTyping = (el: HTMLElement | null) => {
      const tag = el?.tagName.toLowerCase()
      return tag === "input" || tag === "textarea" || !!el?.isContentEditable
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(document.activeElement as HTMLElement | null)) return

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        commit()
        const { canvasId, stickerId } = selection
        updateCanvasStickers(canvasId, (prev) => prev.filter((s) => s.id !== stickerId))
        setSelection(null)
        haptic("warning")
        return
      }

      const arrowDelta: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        ArrowUp: [0, -1], ArrowDown: [0, 1],
      }
      const delta = arrowDelta[e.key]
      if (!delta) return
      e.preventDefault()

      const step = e.shiftKey ? 10 : 1
      const [dx, dy] = [delta[0] * step, delta[1] * step]

      const now = performance.now()
      if (now - lastNudgeAt > NUDGE_COALESCE_MS) commit()
      lastNudgeAt = now

      const { canvasId, stickerId } = selection
      updateCanvasStickers(canvasId, (prev) =>
        prev.map((s) => s.id === stickerId ? { ...s, x: s.x + dx, y: s.y + dy } : s)
      )
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selection, updateCanvasStickers, commit])

  const addSticker = useCallback(
    (emoji: string) => {
      haptic("light")
      commit()
      // Pre-generate the sticker ID so we can select it in the same React
      // batch as the state update — no extra render needed.
      const stickerId = crypto.randomUUID()
      const x = jitterX()
      const y = jitterY()

      const current = canvasesRef.current
      if (current.length === 0) {
        const c = newCanvas()
        setCanvases([{ ...c, stickers: [buildSticker(stickerId, emoji, x, y, 1)] }])
        setActiveCanvasId(c.id)
        setSelection({ canvasId: c.id, stickerId })
        requestAnimationFrame(() => {
          document.querySelector<HTMLElement>(`[data-canvas-id="${c.id}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
        })
      } else {
        const canvasId =
          activeCanvasId && current.some((c) => c.id === activeCanvasId)
            ? activeCanvasId
            : current[0].id
        setCanvases((prev) =>
          prev.map((c) =>
            c.id === canvasId
              ? { ...c, stickers: [...c.stickers, buildSticker(stickerId, emoji, x, y, nextZIndex(c.stickers))] }
              : c
          )
        )
        setSelection({ canvasId, stickerId })
        requestAnimationFrame(() => {
          document.querySelector<HTMLElement>(`[data-canvas-id="${canvasId}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
        })
      }
    },
    [activeCanvasId, commit]
  )

  const dropStickerAt = useCallback(
    (emoji: string, clientX: number, clientY: number) => {
      const cards = document.querySelectorAll<HTMLElement>("[data-canvas-card]")
      for (const card of cards) {
        const rect = card.getBoundingClientRect()
        if (
          clientX < rect.left ||
          clientX > rect.right ||
          clientY < rect.top ||
          clientY > rect.bottom
        ) {
          continue
        }
        const canvasId = card.dataset.canvasId
        if (!canvasId) continue
        // Card has logical width 300; rect.width reflects CSS zoom. Convert
        // the viewport-px drop offset into logical coords so the sticker
        // lands where the user dropped it.
        const scale = rect.width / 300 || 1
        const x = (clientX - (rect.left + rect.width / 2)) / scale
        const y = (clientY - (rect.top + rect.height / 2)) / scale
        const stickerId = crypto.randomUUID()
        commit()
        setCanvases((prev) =>
          prev.map((c) =>
            c.id === canvasId
              ? { ...c, stickers: [...c.stickers, buildSticker(stickerId, emoji, x, y, nextZIndex(c.stickers))] }
              : c
          )
        )
        haptic("light")
        setActiveCanvasId(canvasId)
        setSelection({ canvasId, stickerId })
        return true
      }
      return false
    },
    [commit]
  )

  return (
    <div className="relative h-full">
      <ZoomControls
        zoom={zoom}
        onZoomIn={() => setZoom((z) => nextZoom(z))}
        onZoomOut={() => setZoom((z) => prevZoom(z))}
        onReset={() => setZoom(ZOOM_DEFAULT)}
      />
      <TopBar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />
      <ResizablePanelGroup orientation="vertical" className="h-full">
        <ResizablePanel id="canvas" defaultSize="60%" minSize="30%">
          <div className="h-full w-full overflow-auto bg-muted dark:bg-background">
            <div className="flex min-h-full min-w-full w-fit items-center p-6">
              <div
                className="grid min-w-full w-fit justify-center"
                style={{
                  gridTemplateColumns: `repeat(auto-fit, ${300 * zoom}px)`,
                  gap: `${24 * zoom}px`,
                }}
              >
                {canvases.map((canvas) => (
                  <StickerCanvas
                    key={canvas.id}
                    canvasId={canvas.id}
                    stickers={canvas.stickers}
                    isActive={canvas.id === activeCanvasId}
                    zoom={zoom}
                    selectedStickerId={
                      selection?.canvasId === canvas.id ? selection.stickerId : null
                    }
                    onSelectSticker={(stickerId) => selectSticker(canvas.id, stickerId)}
                    onActivate={() => setActiveCanvasId(canvas.id)}
                    onUpdateStickers={(updater) => updateCanvasStickers(canvas.id, updater)}
                    onDelete={() => deleteCanvas(canvas.id)}
                    onDuplicate={() => duplicateCanvas(canvas.id)}
                    onCommit={commit}
                  />
                ))}
                <AddCanvasButton onAdd={addCanvas} zoom={zoom} />
              </div>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="tray" defaultSize="40%" minSize="10%" maxSize="60%">
          <EmojiTray onSelectEmoji={addSticker} onDropEmojiAt={dropStickerAt} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

function jitterX() {
  return Math.random() * 100 - 50
}

function jitterY() {
  return Math.random() * 60 - 30
}

function buildSticker(id: string, emoji: string, x: number, y: number, zIndex: number): StickerData {
  return {
    id,
    emoji,
    x,
    y,
    size: 48,
    rotation: 0,
    zIndex,
  }
}
