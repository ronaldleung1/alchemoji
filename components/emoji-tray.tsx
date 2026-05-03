"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence, useMotionValue } from "motion/react"
import {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerDragProvider,
} from "@/components/ui/emoji-picker"

const EMOJI_SIZE = 44
const PADDING = 8
const DRAG_THRESHOLD = 4

interface EmojiTrayProps {
  onSelectEmoji: (emoji: string) => void
  onDropEmojiAt: (emoji: string, clientX: number, clientY: number) => boolean
}

type DragPhase = "drag" | "drop" | "cancel"

interface DragState {
  emoji: string
  phase: DragPhase
}

export function EmojiTray({ onSelectEmoji, onDropEmojiAt }: EmojiTrayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(10)
  const [drag, setDrag] = useState<DragState | null>(null)
  const previewX = useMotionValue(0)
  const previewY = useMotionValue(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width - PADDING * 2
      setColumns(Math.max(1, Math.floor(width / EMOJI_SIZE)))
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleEmojiPointerDown = useCallback(
    (emoji: string, ev: React.PointerEvent) => {
      const startX = ev.clientX
      const startY = ev.clientY
      let started = false

      previewX.set(startX)
      previewY.set(startY)

      const onMove = (me: PointerEvent) => {
        if (!started) {
          const dx = me.clientX - startX
          const dy = me.clientY - startY
          if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
            started = true
            setDrag({ emoji, phase: "drag" })
          }
        }
        if (started) {
          previewX.set(me.clientX)
          previewY.set(me.clientY)
        }
      }

      const onUp = (ue: PointerEvent) => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)

        if (!started) return

        // Suppress the click that would otherwise fire onEmojiSelect
        const swallow = (ce: MouseEvent) => {
          ce.stopPropagation()
          ce.preventDefault()
        }
        window.addEventListener("click", swallow, { capture: true, once: true })
        setTimeout(
          () => window.removeEventListener("click", swallow, { capture: true }),
          50
        )

        const accepted = onDropEmojiAt(emoji, ue.clientX, ue.clientY)
        setDrag({ emoji, phase: accepted ? "drop" : "cancel" })
      }

      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
    },
    [onDropEmojiAt, previewX, previewY]
  )

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <EmojiPickerDragProvider onDragStart={handleEmojiPointerDown}>
        <EmojiPicker
          className="h-full w-full"
          columns={columns}
          onEmojiSelect={(emoji) => onSelectEmoji(emoji.emoji)}
        >
          <EmojiPickerSearch placeholder="Search emojis…" />
          <EmojiPickerContent />
          <EmojiPickerFooter />
        </EmojiPicker>
      </EmojiPickerDragProvider>

      <AnimatePresence initial={false}>
        {drag && (
          <motion.div
            key="emoji-drag-preview"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{
              scale:
                drag.phase === "drag"
                  ? 1.3
                  : drag.phase === "drop"
                  ? 0.85
                  : 0.6,
              opacity: drag.phase === "drag" ? 1 : 0,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            onAnimationComplete={() => {
              if (drag.phase !== "drag") setDrag(null)
            }}
            style={{
              position: "fixed",
              left: previewX,
              top: previewY,
              x: "-50%",
              y: "-50%",
              fontSize: 44,
              lineHeight: 1,
              pointerEvents: "none",
              userSelect: "none",
              zIndex: 100,
            }}
          >
            {drag.emoji}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
