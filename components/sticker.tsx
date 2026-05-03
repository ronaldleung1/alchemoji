"use client"

import { motion, useMotionValue, useTransform } from "motion/react"
import { useRef, useCallback, useEffect } from "react"

export interface StickerData {
  id: string
  emoji: string
  x: number
  y: number
  size: number
  rotation: number
  zIndex: number
}

interface StickerProps {
  sticker: StickerData
  isSelected: boolean
  cardRef: React.RefObject<HTMLDivElement | null>
  onSelect: (id: string) => void
  onUpdate: (id: string, patch: Partial<StickerData>) => void
  onDelete: (id: string) => void
}

const MIN_SIZE = 24
const MAX_SIZE = 128

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val))
}

export function Sticker({
  sticker,
  isSelected,
  cardRef,
  onSelect,
  onUpdate,
  onDelete,
}: Readonly<StickerProps>) {
  const stickerRef = useRef<HTMLDivElement>(null)
  const transformRef = useRef<HTMLDivElement>(null)

  const mvX = useMotionValue(sticker.x)
  const mvY = useMotionValue(sticker.y)

  // Derive CSS left/top so (0,0) = card center
  const left = useTransform(mvX, (v) => `calc(50% + ${v}px)`)
  const top = useTransform(mvY, (v) => `calc(50% + ${v}px)`)

  // Sync motion values when props change
  useEffect(() => { mvX.set(sticker.x) }, [sticker.x, mvX])
  useEffect(() => { mvY.set(sticker.y) }, [sticker.y, mvY])

  // ── Drag (body) ──────────────────────────────────────────────────────
  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      // Don't start drag if clicking the handle
      if ((e.target as HTMLElement).closest("[data-handle]")) return

      e.stopPropagation()
      e.preventDefault()

      onSelect(sticker.id)

      const startX = e.clientX
      const startY = e.clientY
      const origX = sticker.x
      const origY = sticker.y

      const onMove = (me: PointerEvent) => {
        const dx = me.clientX - startX
        const dy = me.clientY - startY
        mvX.set(origX + dx)
        mvY.set(origY + dy)
      }

      const onUp = (ue: PointerEvent) => {
        const dx = ue.clientX - startX
        const dy = ue.clientY - startY
        const finalX = origX + dx
        const finalY = origY + dy

        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)

        // Check if center is outside card → delete
        const el = stickerRef.current
        if (cardRef.current && el) {
          const card = cardRef.current.getBoundingClientRect()
          const rect = el.getBoundingClientRect()
          const cx = rect.left + rect.width / 2
          const cy = rect.top + rect.height / 2
          if (
            cx < card.left ||
            cx > card.right ||
            cy < card.top ||
            cy > card.bottom
          ) {
            onDelete(sticker.id)
            return
          }
        }

        onUpdate(sticker.id, { x: finalX, y: finalY })
      }

      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
    },
    [sticker.id, sticker.x, sticker.y, cardRef, onSelect, onUpdate, onDelete, mvX, mvY]
  )

  // ── Scale + Rotate (handle) ──────────────────────────────────────────
  const handleTransformStart = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()

      const el = transformRef.current
      if (!el) return

      // Sticker center in viewport coords
      const rect = el.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const dx0 = e.clientX - centerX
      const dy0 = e.clientY - centerY
      const initialDist = Math.hypot(dx0, dy0) || 1
      const initialAngle = Math.atan2(dy0, dx0)
      const initialSize = sticker.size
      const initialRotation = sticker.rotation

      const computeRotation = (rawRotation: number, shiftKey: boolean) => {
        if (!shiftKey) return rawRotation
        return Math.round(rawRotation / 45) * 45
      }

      const onMove = (me: PointerEvent) => {
        const dx = me.clientX - centerX
        const dy = me.clientY - centerY
        const dist = Math.hypot(dx, dy) || 1
        const angle = Math.atan2(dy, dx)

        const newSize = clamp(
          initialSize * (dist / initialDist),
          MIN_SIZE,
          MAX_SIZE
        )
        const rawRotation =
          initialRotation + (angle - initialAngle) * (180 / Math.PI)
        const newRotation = computeRotation(rawRotation, me.shiftKey)

        // Direct DOM for perf during drag
        if (el) {
          el.style.fontSize = `${newSize}px`
          el.style.transform = `rotate(${newRotation}deg)`
        }
      }

      const onUp = (ue: PointerEvent) => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)

        const dx = ue.clientX - centerX
        const dy = ue.clientY - centerY
        const dist = Math.hypot(dx, dy) || 1
        const angle = Math.atan2(dy, dx)

        const newSize = clamp(
          initialSize * (dist / initialDist),
          MIN_SIZE,
          MAX_SIZE
        )
        const rawRotation =
          initialRotation + (angle - initialAngle) * (180 / Math.PI)
        const newRotation = computeRotation(rawRotation, ue.shiftKey)

        onUpdate(sticker.id, { size: newSize, rotation: newRotation })
      }

      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
    },
    [sticker.id, sticker.size, sticker.rotation, onUpdate]
  )

  return (
    <motion.div
      ref={stickerRef}
      data-sticker
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group absolute cursor-move select-none"
      style={{
        left,
        top,
        x: "-50%",
        y: "-50%",
        zIndex: sticker.zIndex,
        touchAction: "none",
      }}
      onPointerDown={handleDragStart}
    >
      {/* Transform layer (rotate + size, centered origin) */}
      <div
        ref={transformRef}
        style={{
          fontSize: sticker.size,
          lineHeight: 1,
          transform: `rotate(${sticker.rotation}deg)`,
          transformOrigin: "center",
        }}
      >
        {/* Dashed bounding box */}
        <div
          className="pointer-events-none absolute -inset-1 rounded-sm border border-dashed transition-opacity opacity-0 group-hover:opacity-25"
          style={{
            borderColor: "var(--muted-foreground)",
            opacity: isSelected ? 0.5 : undefined,
          }}
        />

        {/* Emoji */}
        <span className="pointer-events-none">{sticker.emoji}</span>

        {/* Scale + Rotate handle */}
        <motion.div
          data-handle
          onPointerDown={handleTransformStart}
          className="absolute -right-2 -bottom-2 flex h-3 w-3 cursor-grab active:cursor-grabbing items-center justify-center rounded-full border border-border bg-foreground shadow-sm"
          style={{
            opacity: isSelected ? 1 : 0,
            pointerEvents: isSelected ? "auto" : "none",
            zIndex: 1,
          }}
          whileHover={{ scale: 1.25 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        />
      </div>
    </motion.div>
  )
}
