"use client"

import { useRef, useCallback } from "react"
import { Sticker, type StickerData } from "./sticker"

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
  const canvasRef = useRef<HTMLDivElement>(null)

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

  return (
    <div ref={canvasRef} className="group relative h-full w-full overflow-hidden">
      {stickers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Tap an emoji below to place a sticker
          </p>
        </div>
      )}
      {stickers.map((sticker) => (
        <Sticker
          key={sticker.id}
          sticker={sticker}
          onBringToFront={bringToFront}
          onUpdateSize={updateSize}
          constraintsRef={canvasRef}
        />
      ))}
    </div>
  )
}
