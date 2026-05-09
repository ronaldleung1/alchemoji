"use client"

import { useRef, useCallback, useState, useEffect } from "react"
import { AnimatePresence } from "motion/react"
import { Sticker, type StickerData } from "./sticker"
import DownloadButton from "./download-button"
import { haptic } from "@/lib/haptics"

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
      haptic("selection")
      setSelectedId(id)
      onUpdateStickers((prev) => {
        // Keep z-indices bounded to 1..n: move selected to top, renumber in order
        const sorted = [...prev].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
        const reordered = [...sorted.filter((s) => s.id !== id), sorted.find((s) => s.id === id)!]
        return prev.map((s) => ({ ...s, zIndex: reordered.findIndex((r) => r.id === s.id) + 1 }))
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
      haptic("warning")
      setSelectedId((prev) => (prev === id ? null : prev))
      onUpdateStickers((prev) => prev.filter((s) => s.id !== id))
    },
    [onUpdateStickers]
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault()
        handleDelete(selectedId)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selectedId, handleDelete])

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedId(null)
    }
  }, [])

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
      <DownloadButton stickers={stickers} onDelete={onDelete} isActive={isActive} />
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
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
