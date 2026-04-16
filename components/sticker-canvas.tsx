"use client"

import { useRef, useCallback } from "react"
import { AnimatePresence } from "motion/react"
import { Sticker, type StickerData } from "./sticker"

export const CARD_W = 400
export const CARD_H = 300

interface StickerCanvasProps {
  stickers: StickerData[]
  onUpdateStickers: (stickers: StickerData[]) => void
  nextZIndex: number
  onBumpZIndex: () => number
}

export function StickerCanvas({
  stickers,
  onUpdateStickers,
  nextZIndex,
  onBumpZIndex,
}: StickerCanvasProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const bringToFront = useCallback(
    (id: string) => {
      const z = onBumpZIndex()
      onUpdateStickers(
        stickers.map((s) => (s.id === id ? { ...s, zIndex: z } : s))
      )
    },
    [stickers, onUpdateStickers, onBumpZIndex]
  )

  const updateSize = useCallback(
    (id: string, size: number) => {
      onUpdateStickers(
        stickers.map((s) => (s.id === id ? { ...s, size } : s))
      )
    },
    [stickers, onUpdateStickers]
  )

  const deleteSticker = useCallback(
    (id: string) => {
      onUpdateStickers(stickers.filter((s) => s.id !== id))
    },
    [stickers, onUpdateStickers]
  )

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div
        ref={cardRef}
        className="relative rounded-2xl border bg-card shadow-sm"
        style={{ width: CARD_W, height: CARD_H }}
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
              cardRef={cardRef}
              onBringToFront={bringToFront}
              onUpdateSize={updateSize}
              onDelete={deleteSticker}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
