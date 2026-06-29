"use client"

import { useEffect, useState, useCallback } from "react"
import { Download } from "lucide-react"
import type { GalleryItem } from "@/lib/gallery"
import { renderStickersToCanvas } from "@/lib/render-canvas"
import { haptic } from "@/lib/haptics"

interface GalleryCardProps {
  item: GalleryItem
}

/**
 * Read-only gallery tile. Renders a published snapshot to a PNG and shows it as
 * an image. Hovering reveals a single inline Download button (no dropdown).
 */
export function GalleryCard({ item }: Readonly<GalleryCardProps>) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    const canvas = renderStickersToCanvas(item.stickers)
    if (!canvas) return
    let url: string | null = null
    canvas.toBlob((blob) => {
      if (!blob) return
      url = URL.createObjectURL(blob)
      setSrc(url)
    }, "image/png")
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [item.stickers])

  const handleDownload = useCallback(() => {
    if (!src) return
    haptic("success")
    const a = document.createElement("a")
    a.href = src
    a.download = "alchemoji.png"
    a.click()
  }, [src])

  return (
    <div className="group/card relative flex aspect-[3/2] items-center justify-center overflow-hidden rounded-xl border bg-card p-4 shadow-card-box">
      {src ? (
        // Blob/object-URL render of the snapshot — next/image gives no benefit
        // for a client-generated data URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="Published alchemoji piece"
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <span className="text-sm text-muted-foreground">Empty piece</span>
      )}

      <button
        type="button"
        onClick={handleDownload}
        disabled={!src}
        aria-label="Download"
        className="absolute top-2 right-2 z-10 rounded-xl p-2.5 text-muted-foreground opacity-0 transition group-hover/card:opacity-100 hover:bg-accent hover:text-accent-foreground active:scale-[0.96] disabled:pointer-events-none disabled:opacity-0"
      >
        <Download size={14} />
      </button>
    </div>
  )
}
