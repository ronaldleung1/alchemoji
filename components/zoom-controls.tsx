"use client"

import { Minus, Plus } from "lucide-react"

const STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

export const ZOOM_MIN = STEPS[0]
export const ZOOM_MAX = STEPS[STEPS.length - 1]
export const ZOOM_DEFAULT = 1

export function nextZoom(z: number) {
  return STEPS.find((s) => s > z + 0.001) ?? z
}

export function prevZoom(z: number) {
  return [...STEPS].reverse().find((s) => s < z - 0.001) ?? z
}

interface ZoomControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: Readonly<ZoomControlsProps>) {
  const canZoomOut = zoom > ZOOM_MIN + 0.001
  const canZoomIn = zoom < ZOOM_MAX - 0.001
  const pct = Math.round(zoom * 100)
  return (
    <div className="absolute left-3 top-3 z-50 flex items-center gap-0.5 rounded-full border bg-background/80 px-1 py-0.5 shadow-sm backdrop-blur">
      <IconButton label="Zoom out" disabled={!canZoomOut} onClick={onZoomOut}>
        <Minus size={14} />
      </IconButton>
      <button
        type="button"
        onClick={onReset}
        title="Reset zoom"
        aria-label="Reset zoom"
        className="min-w-[3.25rem] rounded-full px-2 py-1 text-xs tabular-nums text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
      >
        {pct}%
      </button>
      <IconButton label="Zoom in" disabled={!canZoomIn} onClick={onZoomIn}>
        <Plus size={14} />
      </IconButton>
    </div>
  )
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-full p-1.5 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  )
}
