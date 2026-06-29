"use client"

import { useCallback, useState, useSyncExternalStore } from "react"
import { Download, Copy, Check, Ellipsis, Trash2, Share, CopyPlus, Upload } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { StickerData } from "@/components/sticker"
import { renderStickersToCanvas } from "@/lib/render-canvas"
import { useGallery } from "@/lib/gallery"
import { haptic } from "@/lib/haptics"

const subscribeNoop = () => () => {}
const getServerCanShareSnapshot = () => false
const getCanShareSnapshot = () => {
  if (typeof navigator === "undefined" || !navigator.canShare) return false
  try {
    const probe = new File([new Blob([""], { type: "image/png" })], "probe.png", { type: "image/png" })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

interface DownloadButtonProps {
  stickers: StickerData[]
  onDelete?: () => void
  onDuplicate?: () => void
  isActive?: boolean
}

export default function DownloadButton({ stickers, onDelete, onDuplicate, isActive }: Readonly<DownloadButtonProps>) {
  const [copied, setCopied] = useState(false)
  const [published, setPublished] = useState(false)
  const { publish } = useGallery()
  const canShare = useSyncExternalStore(subscribeNoop, getCanShareSnapshot, getServerCanShareSnapshot)
  const isEmpty = stickers.length === 0

  const buildCanvas = useCallback(() => renderStickersToCanvas(stickers), [stickers])

  const handleDownload = useCallback(() => {
    const canvas = buildCanvas()
    if (!canvas) return
    haptic("success")
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "alchemoji.png"
      a.click()
      URL.revokeObjectURL(url)
    }, "image/png")
  }, [buildCanvas])

  const handleShare = useCallback(async () => {
    const canvas = buildCanvas()
    if (!canvas) return
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    )
    if (!blob) return
    const file = new File([blob], "alchemoji.png", { type: "image/png" })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: "made with alchemoji.fun",
          url: "https://alchemoji.fun",
        })
        haptic("success")
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        console.error("Share failed", err)
      }
    }
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

  const handlePublish = useCallback(() => {
    if (isEmpty) return
    publish(stickers)
    haptic("success")
    setPublished(true)
    setTimeout(() => setPublished(false), 1500)
  }, [publish, stickers, isEmpty])

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
        <DropdownMenuItem onClick={handlePublish} disabled={isEmpty}>
          {published ? <Check size={13} /> : <Upload size={13} />}
          {published ? "Published!" : "Publish to gallery"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {canShare && (
          <DropdownMenuItem onClick={handleShare} disabled={isEmpty}>
            <Share size={13} />
            Share
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleCopy} disabled={isEmpty}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied!" : "Copy image"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload} disabled={isEmpty}>
          <Download size={13} />
          Download
        </DropdownMenuItem>
        {onDuplicate && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDuplicate} disabled={isEmpty}>
              <CopyPlus size={13} />
              Duplicate
            </DropdownMenuItem>
          </>
        )}
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
