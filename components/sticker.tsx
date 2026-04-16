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
  cardRef: React.RefObject<HTMLDivElement | null>
  onBringToFront: (id: string) => void
  onUpdateSize: (id: string, size: number) => void
  onDelete: (id: string) => void
}

const MIN_SIZE = 32
const MAX_SIZE = 160

export function Sticker({
  sticker,
  cardRef,
  onBringToFront,
  onUpdateSize,
  onDelete,
}: Readonly<StickerProps>) {
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

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent) => {
      if (!cardRef.current) return
      const card = cardRef.current.getBoundingClientRect()
      const el = (event.target as HTMLElement)
        .closest("[data-sticker]")
        ?.getBoundingClientRect()
      if (!el) return
      const cx = el.left + el.width / 2
      const cy = el.top + el.height / 2
      if (cx < card.left || cx > card.right || cy < card.top || cy > card.bottom) {
        onDelete(sticker.id)
      }
    },
    [cardRef, sticker.id, onDelete]
  )

  return (
    <motion.div
      data-sticker
      drag
      dragMomentum={false}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onPointerDown={() => onBringToFront(sticker.id)}
      onDragEnd={handleDragEnd}
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
        className={`absolute -right-1 -bottom-1 flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded-full border border-border bg-background text-[10px] text-muted-foreground opacity-0 shadow-sm transition-opacity hover:opacity-100 ${isResizing ? "opacity-100" : ""}`}
        style={{ zIndex: sticker.zIndex + 1 }}
      >
        ↘
      </div>
    </motion.div>
  )
}
