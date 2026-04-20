"use client"

import { useRef, useCallback, useState } from "react"
import { AnimatePresence } from "motion/react"
import { Sticker, type StickerData } from "./sticker"

export const CARD_W = 300
export const CARD_H = 200

interface StickerCanvasProps {
  stickers: StickerData[]
  onUpdateStickers: React.Dispatch<React.SetStateAction<StickerData[]>>
  onBumpZIndex: () => number
}

export function StickerCanvas({
  stickers,
  onUpdateStickers,
  onBumpZIndex,
}: Readonly<StickerCanvasProps>) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id)
      const z = onBumpZIndex()
      onUpdateStickers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, zIndex: z } : s))
      )
    },
    [onUpdateStickers, onBumpZIndex]
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

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if clicking the card background itself
      if (e.target === e.currentTarget) {
        setSelectedId(null)
      }
    },
    []
  )

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div
        ref={cardRef}
        className="relative rounded-2xl border bg-card shadow-sm"
        style={{ width: CARD_W, height: CARD_H }}
        onClick={handleCardClick}
      >
        {stickers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">
              Tap an emoji below to add a sticker
            </p>
          </div>
        )}
        <AnimatePresence>
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
    </div>
  )
}
