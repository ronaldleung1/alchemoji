"use client"

import { Plus } from "lucide-react"
import { CARD_W, CARD_H } from "./sticker-canvas"

interface GhostCanvasProps {
  onAdd: () => void
}

export function GhostCanvas({ onAdd }: Readonly<GhostCanvasProps>) {
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label="Add canvas"
      className="group/ghost flex shrink-0 items-center justify-center rounded-xl border border-dashed border-border/60 bg-card/30 text-muted-foreground/60 transition hover:border-border hover:bg-card/60 hover:text-foreground active:scale-[0.99]"
      style={{ width: CARD_W, height: CARD_H }}
    >
      <Plus
        size={48}
        strokeWidth={1.5}
        className="transition group-hover/ghost:scale-110"
      />
    </button>
  )
}
