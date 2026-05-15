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
  zoom?: number
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
  zoom = 1,
  onSelect,
  onUpdate,
  onDelete,
}: Readonly<StickerProps>) {
  const stickerRef = useRef<HTMLDivElement>(null)
  const transformRef = useRef<HTMLDivElement>(null)

  const mvX = useMotionValue(sticker.x)
  const mvY = useMotionValue(sticker.y)

  // Derive CSS left/top so (0,0) = card center. Multiply by zoom so logical
  // coords stay in unzoomed units while the rendered position scales with
  // the card.
  const left = useTransform(mvX, (v) => `calc(50% + ${v * zoom}px)`)
  const top = useTransform(mvY, (v) => `calc(50% + ${v * zoom}px)`)

  // Sync motion values when props change. Re-pushing the same value on zoom
  // change forces useTransform to re-render with the latest zoom multiplier.
  useEffect(() => { mvX.set(sticker.x) }, [sticker.x, zoom, mvX])
  useEffect(() => { mvY.set(sticker.y) }, [sticker.y, zoom, mvY])

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
      // CSS `zoom` on an ancestor inflates viewport-px deltas relative to the
      // logical coords we store. Recover the factor from the card's rendered
      // width vs its declared 300px logical width.
      const cardWidth = cardRef.current?.getBoundingClientRect().width ?? 300
      const scale = cardWidth / 300 || 1

      const onMove = (me: PointerEvent) => {
        const dx = (me.clientX - startX) / scale
        const dy = (me.clientY - startY) / scale
        mvX.set(origX + dx)
        mvY.set(origY + dy)
      }

      const onUp = (ue: PointerEvent) => {
        const dx = (ue.clientX - startX) / scale
        const dy = (ue.clientY - startY) / scale
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

        // Tap without drag: skip redundant write (no history entry needed).
        if (dx === 0 && dy === 0) return

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

        // Direct DOM for perf during drag. Scale by zoom so the visual size
        // matches the committed render (which also multiplies by zoom).
        if (el) {
          el.style.fontSize = `${newSize * zoom}px`
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

        // Skip noop on click-without-gesture.
        if (newSize === initialSize && newRotation === initialRotation) return

        onUpdate(sticker.id, { size: newSize, rotation: newRotation })
      }

      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
    },
    [sticker.id, sticker.size, sticker.rotation, zoom, onUpdate]
  )

  return (
    <motion.div
      ref={stickerRef}
      data-sticker
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 400, damping: 25 } }}
      exit={{ scale: 0.7, opacity: 0, filter: "blur(2px)", transition: { duration: 0.15, ease: "easeOut" } }}
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
          fontSize: sticker.size * zoom,
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

        {/* Scale + Rotate handle — outer div for 40px hit area, inner for visual */}
        <div
          data-handle
          onPointerDown={handleTransformStart}
          className="absolute -right-5.5 -bottom-5.5 flex h-10 w-10 cursor-grab active:cursor-grabbing items-center justify-center"
          style={{
            opacity: isSelected ? 1 : 0,
            pointerEvents: isSelected ? "auto" : "none",
            zIndex: 1,
          }}
        >
          <motion.div
            className="h-3 w-3 rounded-full border border-border bg-foreground shadow-sm"
            whileHover={{ scale: 1.25 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          />
        </div>
      </div>
    </motion.div>
  )
}
