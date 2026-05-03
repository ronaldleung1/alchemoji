"use client"

import { useCallback } from "react"
import { Download } from "lucide-react"
import { CARD_W, CARD_H } from "@/components/sticker-canvas"
import type { StickerData } from "@/components/sticker"

interface DownloadButtonProps {
  stickers: StickerData[]
}

export default function DownloadButton({ stickers }: Readonly<DownloadButtonProps>) {
  const handleDownload = useCallback(() => {
    const cardEl = document.querySelector<HTMLElement>("[data-canvas-card]")
    if (!cardEl) return

    const scale = 2
    const canvas = document.createElement("canvas")
    canvas.width = CARD_W * scale
    canvas.height = CARD_H * scale
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(scale, scale)

    const cardStyle = getComputedStyle(cardEl)
    ctx.fillStyle = cardStyle.backgroundColor || "#ffffff"

    const radius = parseFloat(cardStyle.borderTopLeftRadius) || 16
    ctx.beginPath()
    ctx.roundRect(0, 0, CARD_W, CARD_H, radius)
    ctx.fill()

    const ordered = [...stickers].sort((a, b) => a.zIndex - b.zIndex)
    for (const s of ordered) {
      ctx.save()
      ctx.translate(CARD_W / 2 + s.x, CARD_H / 2 + s.y)
      ctx.rotate((s.rotation * Math.PI) / 180)
      ctx.font = `${s.size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(s.emoji, 0, 0)
      ctx.restore()
    }

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "emoji-canvas.png"
      a.click()
      URL.revokeObjectURL(url)
    }, "image/png")
  }, [stickers])

  return (
    <button
      onClick={handleDownload}
      className="absolute right-11 top-3 z-50 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label="Download canvas as image"
    >
      <Download size={16} />
    </button>
  )
}
