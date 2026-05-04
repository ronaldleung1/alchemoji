"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { StickerCanvas } from "@/components/sticker-canvas"
import { AddCanvasButton } from "@/components/add-canvas-button"
import { EmojiTray } from "@/components/emoji-tray"
import type { StickerData } from "@/components/sticker"

const ThemeToggle = dynamic(() => import("@/components/theme-toggle"), { ssr: false })

const STORAGE_KEY = "emoji-alchemy:canvases"

interface CanvasData {
  id: string
  stickers: StickerData[]
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
  const [hydrated, setHydrated] = useState(false)
  const writeFailedRef = useRef(false)

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
    const c = newCanvas()
    setCanvases((prev) => [...prev, c])
    setActiveCanvasId(c.id)
  }, [])

  const deleteCanvas = useCallback((canvasId: string) => {
    setCanvases((prev) => {
      const next = prev.filter((c) => c.id !== canvasId)
      setActiveCanvasId((active) =>
        active === canvasId ? next[0]?.id ?? null : active
      )
      return next
    })
  }, [])

  const addSticker = useCallback(
    (emoji: string) => {
      setCanvases((prev) => {
        if (prev.length === 0) {
          const c = newCanvas()
          c.stickers.push(buildSticker(emoji, jitterX(), jitterY(), 1))
          setActiveCanvasId(c.id)
          return [c]
        }
        const targetId =
          activeCanvasId && prev.some((c) => c.id === activeCanvasId)
            ? activeCanvasId
            : prev[0].id
        return prev.map((c) =>
          c.id === targetId
            ? {
                ...c,
                stickers: [
                  ...c.stickers,
                  buildSticker(emoji, jitterX(), jitterY(), nextZIndex(c.stickers)),
                ],
              }
            : c
        )
      })
    },
    [activeCanvasId]
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
        const x = clientX - (rect.left + rect.width / 2)
        const y = clientY - (rect.top + rect.height / 2)
        setCanvases((prev) =>
          prev.map((c) =>
            c.id === canvasId
              ? {
                  ...c,
                  stickers: [
                    ...c.stickers,
                    buildSticker(emoji, x, y, nextZIndex(c.stickers)),
                  ],
                }
              : c
          )
        )
        setActiveCanvasId(canvasId)
        return true
      }
      return false
    },
    []
  )

  return (
    <div className="relative h-full">
      <ThemeToggle />
      <ResizablePanelGroup orientation="vertical" className="h-full">
        <ResizablePanel id="canvas" defaultSize="60%" minSize="30%">
          <div className="h-full w-full overflow-y-scroll overflow-x-hidden bg-muted dark:bg-background [scrollbar-gutter:stable]">
            <div className="flex min-h-full w-full items-center p-6">
              <div className="grid w-full grid-cols-[repeat(auto-fit,300px)] justify-center gap-6">
                {canvases.map((canvas) => (
                  <StickerCanvas
                    key={canvas.id}
                    canvasId={canvas.id}
                    stickers={canvas.stickers}
                    isActive={canvas.id === activeCanvasId}
                    onActivate={() => setActiveCanvasId(canvas.id)}
                    onUpdateStickers={(updater) => updateCanvasStickers(canvas.id, updater)}
                    onDelete={() => deleteCanvas(canvas.id)}
                  />
                ))}
                <AddCanvasButton onAdd={addCanvas} />
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

function buildSticker(emoji: string, x: number, y: number, zIndex: number): StickerData {
  return {
    id: crypto.randomUUID(),
    emoji,
    x,
    y,
    size: 48,
    rotation: 0,
    zIndex,
  }
}
