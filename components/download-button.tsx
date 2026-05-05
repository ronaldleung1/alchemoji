"use client"

import { useCallback, useState } from "react"
import { Download, Copy, Check, Ellipsis, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CARD_W } from "@/components/sticker-canvas"
import type { StickerData } from "@/components/sticker"
import { haptic } from "@/lib/haptics"

interface DownloadButtonProps {
  stickers: StickerData[]
  onDelete?: () => void
  isActive?: boolean
}

export default function DownloadButton({ stickers, onDelete, isActive }: Readonly<DownloadButtonProps>) {
  const [copied, setCopied] = useState(false)

  const buildCanvas = useCallback(() => {
    if (stickers.length === 0) return null

    const scale = 2
    const padding = 16

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const s of stickers) {
      const cx = CARD_W / 2 + s.x
      const cy = CARD_W / 2 + s.y
      const rad = (s.rotation * Math.PI) / 180
      const half = s.size / 2
      const hw = half * (Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)))
      const hh = half * (Math.abs(Math.sin(rad)) + Math.abs(Math.cos(rad)))
      minX = Math.min(minX, cx - hw)
      maxX = Math.max(maxX, cx + hw)
      minY = Math.min(minY, cy - hh)
      maxY = Math.max(maxY, cy + hh)
    }

    const bboxW = maxX - minX
    const bboxH = maxY - minY
    const outW = Math.ceil(bboxW) + padding * 2
    const outH = Math.ceil(bboxH) + padding * 2
    const offsetX = padding - minX
    const offsetY = padding - minY

    const canvas = document.createElement("canvas")
    canvas.width = outW * scale
    canvas.height = outH * scale
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.scale(scale, scale)

    const ordered = [...stickers].sort((a, b) => a.zIndex - b.zIndex)
    for (const s of ordered) {
      ctx.save()
      ctx.translate(CARD_W / 2 + s.x + offsetX, CARD_W / 2 + s.y + offsetY)
      ctx.rotate((s.rotation * Math.PI) / 180)
      ctx.font = `${s.size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(s.emoji, 0, 0)
      ctx.restore()
    }

    return canvas
  }, [stickers])

  const handleDownload = useCallback(() => {
    const canvas = buildCanvas()
    if (!canvas) return
    haptic("success")
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "emoji-canvas.png"
      a.click()
      URL.revokeObjectURL(url)
    }, "image/png")
  }, [buildCanvas])

  const handleCopy = useCallback(async () => {
    const canvas = buildCanvas()
    if (!canvas) return
    const blobPromise = new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png")
    )
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })])
    haptic("success")
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [buildCanvas])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="absolute top-2 right-2 z-50 rounded-xl p-2.5 text-muted-foreground opacity-0 transition group-hover/card:opacity-100 data-[active=true]:opacity-100 data-[state=open]:opacity-100 hover:bg-accent hover:text-accent-foreground active:scale-[0.96]"
          data-active={isActive}
          aria-label="Canvas actions"
        >
          <Ellipsis size={13} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom">
        <DropdownMenuItem onClick={handleCopy}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied!" : "Copy image"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload}>
          <Download size={13} />
          Download
        </DropdownMenuItem>
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              variant="destructive"
            >
              <Trash2 size={13} />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
