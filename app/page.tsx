"use client"

import { useState, useCallback, useRef } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { StickerCanvas } from "@/components/sticker-canvas"
import { EmojiTray } from "@/components/emoji-tray"
import type { StickerData } from "@/components/sticker"

export default function Page() {
  const { resolvedTheme, setTheme } = useTheme()
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

  return (
    <div className="relative h-full">
      <button
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className="absolute right-3 top-3 z-50 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="Toggle theme"
      >
        {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>
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
    </div>
  )
}
