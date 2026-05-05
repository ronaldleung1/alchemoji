"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"

const ThemeToggle = dynamic(() => import("@/components/theme-toggle"), { ssr: false })

interface StickerData {
  id: string
  emoji: string
  x: number
  y: number
  size: number
  rotation: number
  zIndex: number
}

interface CanvasData {
  id: string
  stickers: StickerData[]
}

interface Design {
  id: string
  name: string
  canvases: CanvasData[]
  savedAt: string
}

function DesignPreview({ canvases }: { canvases: CanvasData[] }) {
  const allStickers = canvases.flatMap((c) => c.stickers)
  if (allStickers.length === 0) {
    return <div className="flex h-full items-center justify-center text-muted-foreground/30 text-xs">empty</div>
  }

  // Normalize sticker positions to fit the preview box (120x120)
  const xs = allStickers.map((s) => s.x)
  const ys = allStickers.map((s) => s.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const rangeX = Math.max(maxX - minX, 1)
  const rangeY = Math.max(maxY - minY, 1)
  const pad = 16

  return (
    <div className="relative h-full w-full overflow-hidden">
      {allStickers.map((s) => {
        const nx = pad + ((s.x - minX) / rangeX) * (120 - pad * 2)
        const ny = pad + ((s.y - minY) / rangeY) * (120 - pad * 2)
        const fontSize = Math.max(12, Math.min(s.size * 0.45, 32))
        return (
          <span
            key={s.id}
            style={{
              position: "absolute",
              left: nx,
              top: ny,
              fontSize,
              transform: `rotate(${s.rotation}deg) translate(-50%, -50%)`,
              lineHeight: 1,
            }}
          >
            {s.emoji}
          </span>
        )
      })}
    </div>
  )
}

export default function GalleryPage() {
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/designs")
      .then((r) => r.json())
      .then((data) => { setDesigns(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="relative flex h-full flex-col">
      <ThemeToggle />
      <div className="absolute top-4 left-4 z-10">
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
          ← home
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-16">
        <h1 className="font-heading mb-1 text-2xl font-semibold">gallery</h1>
        <p className="text-muted-foreground mb-8 text-sm">designs from everyone</p>

        {loading ? (
          <p className="text-muted-foreground text-sm">loading…</p>
        ) : designs.length === 0 ? (
          <p className="text-muted-foreground text-sm">no designs yet — <Link href="/studio" className="underline underline-offset-2">make one</Link></p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
            {designs.map((design) => (
              <div key={design.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="h-36 bg-muted/30">
                  <DesignPreview canvases={design.canvases} />
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-sm font-medium truncate">{design.name}</p>
                  <p className="text-muted-foreground text-[11px]">
                    {new Date(design.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
