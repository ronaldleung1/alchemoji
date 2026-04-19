"use client"

import { useState, useCallback, useRef } from "react"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { StickerCanvas, CARD_W, CARD_H } from "@/components/sticker-canvas"
import { EmojiTray } from "@/components/emoji-tray"
import type { StickerData } from "@/components/sticker"

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
        x: CARD_W / 2 + jitterX,
        y: CARD_H / 2 + jitterY,
        size: 48,
        rotation: 0,
        zIndex: bumpZIndex(),
      }
      setStickers((prev) => [...prev, newSticker])
    },
    [bumpZIndex]
  )

  return (
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
        <EmojiTray onSelectEmoji={addSticker} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
