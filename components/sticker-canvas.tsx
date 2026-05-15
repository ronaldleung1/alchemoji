"use client"

import { useRef, useCallback } from "react"
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
  zoom?: number
  selectedStickerId: string | null
  onSelectSticker: (stickerId: string | null) => void
  onActivate: () => void
  onUpdateStickers: (updater: (prev: StickerData[]) => StickerData[]) => void
  onDelete: () => void
  onDuplicate: () => void
  /** Snapshot for undo/redo before a user-driven mutation. Z-index restacking
   *  on select intentionally skips this to avoid polluting the undo stack. */
  onCommit: () => void
}

export function StickerCanvas({
  canvasId,
  stickers,
  isActive,
  zoom = 1,
  selectedStickerId,
  onSelectSticker,
  onActivate,
  onUpdateStickers,
  onDelete,
  onDuplicate,
  onCommit,
}: Readonly<StickerCanvasProps>) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleSelect = useCallback(
    (id: string) => {
      haptic("selection")
      onSelectSticker(id)
      onUpdateStickers((prev) => {
        // Keep z-indices bounded to 1..n: move selected to top, renumber in order
        const sorted = [...prev].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
        const reordered = [...sorted.filter((s) => s.id !== id), sorted.find((s) => s.id === id)!]
        return prev.map((s) => ({ ...s, zIndex: reordered.findIndex((r) => r.id === s.id) + 1 }))
      })
    },
    [onSelectSticker, onUpdateStickers]
  )

  const handleUpdate = useCallback(
    (id: string, patch: Partial<StickerData>) => {
      onCommit()
      onUpdateStickers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
      )
    },
    [onUpdateStickers, onCommit]
  )

  const handleDelete = useCallback(
    (id: string) => {
      haptic("warning")
      onCommit()
      if (selectedStickerId === id) onSelectSticker(null)
      onUpdateStickers((prev) => prev.filter((s) => s.id !== id))
    },
    [selectedStickerId, onSelectSticker, onUpdateStickers, onCommit]
  )

  return (
    <div
      ref={cardRef}
      data-canvas-card
      data-canvas-id={canvasId}
      className={`group/card relative shrink-0 scroll-my-6 rounded-xl border bg-card shadow-card-box ring-offset-background transition-shadow ${
        isActive ? "ring-2 ring-ring ring-offset-2" : ""
      }`}
      style={{ width: CARD_W * zoom, height: CARD_H * zoom }}
      onPointerDownCapture={onActivate}
    >
      <DownloadButton
        stickers={stickers}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        isActive={isActive}
      />
      {stickers.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p
            className="text-muted-foreground"
            style={{ fontSize: 12 * zoom }}
          >
            Tap an emoji below to add a sticker
          </p>
        </div>
      )}
      <AnimatePresence initial={false}>
        {stickers.map((sticker) => (
          <Sticker
            key={sticker.id}
            sticker={sticker}
            isSelected={selectedStickerId === sticker.id}
            cardRef={cardRef}
            zoom={zoom}
            onSelect={handleSelect}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
