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
import { CARD_W, CARD_H } from "@/components/sticker-canvas"
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
    const EMOJI_FONT = `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`

    // Render an emoji into an offscreen canvas, crop to its ink bounds,
    // and report the ink's offset from the DOM inline-box center.
    //
    // The DOM transform layer has line-height:1, so its box is `size` tall
    // with the baseline placed inside according to the font's ascent/descent
    // (with half-leading = (size - (ascent+descent)) / 2). The vertical center
    // of that box, measured from the baseline, is (descent - ascent) / 2.
    // We render with textBaseline:"alphabetic" and position the baseline so
    // that the DOM box center lands at (boxSize/2, boxSize/2) in the offscreen.
    const renderEmojiBitmap = (emoji: string, size: number) => {
      const pad = Math.ceil(size * 0.8)
      const boxSize = Math.ceil(size) + pad * 2
      const off = document.createElement("canvas")
      off.width = boxSize * scale
      off.height = boxSize * scale
      const octx = off.getContext("2d")
      if (!octx) return null
      octx.scale(scale, scale)
      octx.font = `${size}px ${EMOJI_FONT}`
      octx.textAlign = "center"
      octx.textBaseline = "alphabetic"

      const m = octx.measureText(emoji)
      const asc = m.fontBoundingBoxAscent ?? size * 0.9
      const desc = m.fontBoundingBoxDescent ?? size * 0.1
      const baselineY = boxSize / 2 + (asc - desc) / 2
      octx.fillText(emoji, boxSize / 2, baselineY)

      const img = octx.getImageData(0, 0, off.width, off.height)
      const data = img.data
      let inkMinX = Infinity, inkMinY = Infinity, inkMaxX = -Infinity, inkMaxY = -Infinity
      for (let y = 0; y < off.height; y++) {
        for (let x = 0; x < off.width; x++) {
          if (data[(y * off.width + x) * 4 + 3] > 0) {
            if (x < inkMinX) inkMinX = x
            if (x > inkMaxX) inkMaxX = x
            if (y < inkMinY) inkMinY = y
            if (y > inkMaxY) inkMaxY = y
          }
        }
      }
      if (!isFinite(inkMinX)) return null

      const inkW = (inkMaxX - inkMinX + 1) / scale
      const inkH = (inkMaxY - inkMinY + 1) / scale
      const inkCenterX = (inkMinX + inkMaxX + 1) / 2 / scale
      const inkCenterY = (inkMinY + inkMaxY + 1) / 2 / scale

      return {
        canvas: off,
        sx: inkMinX,
        sy: inkMinY,
        sw: inkMaxX - inkMinX + 1,
        sh: inkMaxY - inkMinY + 1,
        inkW,
        inkH,
        dx: inkCenterX - boxSize / 2,
        dy: inkCenterY - boxSize / 2,
      }
    }

    const bitmaps = stickers.map((s) => ({ s, bmp: renderEmojiBitmap(s.emoji, s.size) }))

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const { s, bmp } of bitmaps) {
      const cx = CARD_W / 2 + s.x
      const cy = CARD_H / 2 + s.y
      const rad = (s.rotation * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      const halfW = (bmp ? bmp.inkW : s.size) / 2
      const halfH = (bmp ? bmp.inkH : s.size) / 2
      // Center of ink relative to sticker center, rotated.
      const ox = bmp ? bmp.dx : 0
      const oy = bmp ? bmp.dy : 0
      const rx = ox * cos - oy * sin
      const ry = ox * sin + oy * cos
      const hw = halfW * Math.abs(cos) + halfH * Math.abs(sin)
      const hh = halfW * Math.abs(sin) + halfH * Math.abs(cos)
      minX = Math.min(minX, cx + rx - hw)
      maxX = Math.max(maxX, cx + rx + hw)
      minY = Math.min(minY, cy + ry - hh)
      maxY = Math.max(maxY, cy + ry + hh)
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

    const ordered = [...bitmaps].sort((a, b) => a.s.zIndex - b.s.zIndex)
    for (const { s, bmp } of ordered) {
      ctx.save()
      ctx.translate(CARD_W / 2 + s.x + offsetX, CARD_H / 2 + s.y + offsetY)
      ctx.rotate((s.rotation * Math.PI) / 180)
      if (bmp) {
        // Draw cropped ink so that ink center sits at (dx, dy) — same as DOM.
        ctx.drawImage(
          bmp.canvas,
          bmp.sx,
          bmp.sy,
          bmp.sw,
          bmp.sh,
          bmp.dx - bmp.inkW / 2,
          bmp.dy - bmp.inkH / 2,
          bmp.inkW,
          bmp.inkH
        )
      } else {
        ctx.font = `${s.size}px ${EMOJI_FONT}`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(s.emoji, 0, 0)
      }
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
          className="absolute top-2 right-2 z-[9999] rounded-xl p-2.5 text-muted-foreground opacity-0 transition group-hover/card:opacity-100 data-[active=true]:opacity-100 data-[state=open]:opacity-100 hover:bg-accent hover:text-accent-foreground active:scale-[0.96]"
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
