"use client"

import { motion } from "motion/react"
import { useRef, useState, useCallback } from "react"

export interface StickerData {
  id: string
  emoji: string
  x: number
  y: number
  size: number
  zIndex: number
}

interface StickerProps {
  sticker: StickerData
  onBringToFront: (id: string) => void
  onUpdateSize: (id: string, size: number) => void
  constraintsRef: React.RefObject<HTMLDivElement | null>
}

const MIN_SIZE = 32
const MAX_SIZE = 160

export function Sticker({
  sticker,
  onBringToFront,
  onUpdateSize,
  constraintsRef,
}: StickerProps) {
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartRef = useRef<{ y: number; size: number } | null>(null)

  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      setIsResizing(true)
      resizeStartRef.current = { y: e.clientY, size: sticker.size }

      const handleMove = (moveEvent: PointerEvent) => {
        if (!resizeStartRef.current) return
        const delta = resizeStartRef.current.y - moveEvent.clientY
        const newSize = Math.min(
          MAX_SIZE,
          Math.max(MIN_SIZE, resizeStartRef.current.size + delta)
        )
        onUpdateSize(sticker.id, newSize)
      }

      const handleUp = () => {
        setIsResizing(false)
        resizeStartRef.current = null
        window.removeEventListener("pointermove", handleMove)
        window.removeEventListener("pointerup", handleUp)
      }

      window.addEventListener("pointermove", handleMove)
      window.addEventListener("pointerup", handleUp)
    },
    [sticker.id, sticker.size, onUpdateSize]
  )

  return (
    <motion.div
      drag
      dragConstraints={constraintsRef}
      dragMomentum={false}
      onPointerDown={() => onBringToFront(sticker.id)}
      className="absolute cursor-grab select-none active:cursor-grabbing"
      style={{
        left: sticker.x,
        top: sticker.y,
        zIndex: sticker.zIndex,
        fontSize: sticker.size,
        lineHeight: 1,
        touchAction: "none",
      }}
    >
      <span className="pointer-events-none">{sticker.emoji}</span>
      <div
        onPointerDown={handleResizeStart}
        className={`absolute -right-1 -bottom-1 flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded-full border border-border bg-background text-[10px] text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 ${isResizing ? "opacity-100" : "hover:opacity-100"}`}
        style={{ zIndex: sticker.zIndex + 1 }}
      >
        ↘
      </div>
    </motion.div>
  )
}
