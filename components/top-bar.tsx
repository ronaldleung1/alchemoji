"use client"

import dynamic from "next/dynamic"
import { Undo2, Redo2 } from "lucide-react"

const ThemeToggle = dynamic(() => import("@/components/theme-toggle"), { ssr: false })

interface TopBarProps {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function TopBar({ canUndo, canRedo, onUndo, onRedo }: Readonly<TopBarProps>) {
  return (
    <div className="absolute right-3 top-3 z-50 flex items-center gap-0.5">
      <IconButton label="Undo" shortcut="⌘Z" disabled={!canUndo} onClick={onUndo}>
        <Undo2 size={16} />
      </IconButton>
      <IconButton label="Redo" shortcut="⇧⌘Z" disabled={!canRedo} onClick={onRedo}>
        <Redo2 size={16} />
      </IconButton>
      <div className="mx-1 h-4 w-px bg-border" aria-hidden />
      <ThemeToggle />
    </div>
  )
}

function IconButton({
  label,
  shortcut,
  disabled,
  onClick,
  children,
}: {
  label: string
  shortcut?: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  const tip = shortcut ? `${label} (${shortcut})` : label
  return (
    <button
      type="button"
      aria-label={tip}
      title={tip}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md p-2.5 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  )
}
