"use client"

import { useRef, useCallback, useState, useEffect } from "react"
import { AnimatePresence } from "motion/react"
import { Trash2 } from "lucide-react"
import { Sticker, type StickerData } from "./sticker"
import DownloadButton from "./download-button"

export const CARD_W = 300
export const CARD_H = 200

interface StickerCanvasProps {
  canvasId: string
  stickers: StickerData[]
  isActive: boolean
  onActivate: () => void
  onUpdateStickers: (updater: (prev: StickerData[]) => StickerData[]) => void
  onDelete: () => void
}

export function StickerCanvas({
  canvasId,
  stickers,
  isActive,
  onActivate,
  onUpdateStickers,
  onDelete,
}: Readonly<StickerCanvasProps>) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id)
      onUpdateStickers((prev) => {
        const maxZ = prev.reduce((m, s) => Math.max(m, s.zIndex ?? 0), 0)
        return prev.map((s) => (s.id === id ? { ...s, zIndex: maxZ + 1 } : s))
      })
    },
    [onUpdateStickers]
  )

  const handleUpdate = useCallback(
    (id: string, patch: Partial<StickerData>) => {
      onUpdateStickers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
      )
    },
    [onUpdateStickers]
  )

  const handleDelete = useCallback(
    (id: string) => {
      setSelectedId((prev) => (prev === id ? null : prev))
      onUpdateStickers((prev) => prev.filter((s) => s.id !== id))
    },
    [onUpdateStickers]
  )

  const handleFlip = useCallback(
    (id: string) => {
      onUpdateStickers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, flipped: !s.flipped } : s))
      )
    },
    [onUpdateStickers]
  )

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedId(null)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId) return
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement).tagName
        if (tag === "INPUT" || tag === "TEXTAREA") return
        e.preventDefault()
        handleDelete(selectedId)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedId, handleDelete])

  return (
    <div
      ref={cardRef}
      data-canvas-card
      data-canvas-id={canvasId}
      className={`group/card relative shrink-0 rounded-xl border bg-card shadow-card-box ring-offset-background transition-shadow ${
        isActive ? "ring-2 ring-ring ring-offset-2" : ""
      }`}
      style={{ width: CARD_W, height: CARD_H }}
      onClick={handleCardClick}
      onPointerDownCapture={onActivate}
    >
      <DownloadButton stickers={stickers} onDelete={onDelete} />
      <button
        onClick={onDelete}
        className="absolute bottom-2 right-2 z-50 rounded-xl p-2.5 text-muted-foreground opacity-0 transition group-hover/card:opacity-100 hover:bg-destructive/10 hover:text-destructive active:scale-[0.96]"
        aria-label="Delete canvas"
      >
        <Trash2 size={13} />
      </button>
      {stickers.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">
            Tap an emoji below to add a sticker
          </p>
        </div>
      )}
      <AnimatePresence initial={false}>
        {stickers.map((sticker) => (
          <Sticker
            key={sticker.id}
            sticker={sticker}
            isSelected={selectedId === sticker.id}
            cardRef={cardRef}
            onSelect={handleSelect}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onFlip={handleFlip}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
