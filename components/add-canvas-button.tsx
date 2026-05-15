"use client"

import { Plus } from "lucide-react"
import { CARD_W, CARD_H } from "./sticker-canvas"

interface AddCanvasButtonProps {
  onAdd: () => void
  zoom?: number
}

export function AddCanvasButton({ onAdd, zoom = 1 }: Readonly<AddCanvasButtonProps>) {
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label="Add canvas"
      className="group/add flex shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card/30 text-muted-foreground/60 transition hover:border-border hover:bg-card/60 hover:text-foreground active:scale-[0.99]"
      style={{ width: CARD_W * zoom, height: CARD_H * zoom }}
    >
      <Plus
        size={48 * zoom}
        strokeWidth={1.5}
        className="transition-transform group-hover/add:scale-110"
      />
    </button>
  )
}
