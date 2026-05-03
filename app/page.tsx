"use client"

import { useState, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { StickerCanvas } from "@/components/sticker-canvas"
import { EmojiTray } from "@/components/emoji-tray"
import type { StickerData } from "@/components/sticker"

const ThemeToggle = dynamic(() => import("@/components/theme-toggle"), { ssr: false })
const DownloadButton = dynamic(() => import("@/components/download-button"), { ssr: false })

export default function Page() {
  const [stickers, setStickers] = useState<StickerData[]>([])
  const zIndexRef = useRef(1)

  const bumpZIndex = useCallback(() => {
    zIndexRef.current += 1
    return zIndexRef.current
  }, [])

  const addSticker = useCallback(
    (emoji: string) => {
      const jitterX = Math.random() * 100 - 50
      const jitterY = Math.random() * 60 - 30
      const newSticker: StickerData = {
        id: crypto.randomUUID(),
        emoji,
        x: jitterX,
        y: jitterY,
        size: 48,
        rotation: 0,
        zIndex: bumpZIndex(),
      }
      setStickers((prev) => [...prev, newSticker])
    },
    [bumpZIndex]
  )

  const dropStickerAt = useCallback(
    (emoji: string, clientX: number, clientY: number) => {
      const card = document.querySelector(
        "[data-canvas-card]"
      ) as HTMLElement | null
      if (!card) return false
      const rect = card.getBoundingClientRect()
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return false
      }
      const x = clientX - (rect.left + rect.width / 2)
      const y = clientY - (rect.top + rect.height / 2)
      const newSticker: StickerData = {
        id: crypto.randomUUID(),
        emoji,
        x,
        y,
        size: 48,
        rotation: 0,
        zIndex: bumpZIndex(),
      }
      setStickers((prev) => [...prev, newSticker])
      return true
    },
    [bumpZIndex]
  )

  return (
    <div className="relative h-full">
      <DownloadButton stickers={stickers} />
      <ThemeToggle />
    <ResizablePanelGroup orientation="vertical" className="h-full">
      <ResizablePanel id="canvas" defaultSize="60%" minSize="30%">
        <StickerCanvas
          stickers={stickers}
          onUpdateStickers={setStickers}
          onBumpZIndex={bumpZIndex}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel id="tray" defaultSize="40%" minSize="10%" maxSize="60%">
        <EmojiTray onSelectEmoji={addSticker} onDropEmojiAt={dropStickerAt} />
      </ResizablePanel>
    </ResizablePanelGroup>
    </div>
  )
}
