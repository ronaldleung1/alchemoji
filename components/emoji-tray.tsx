"use client"

import { useRef, useState, useEffect } from "react"
import {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
  EmojiPickerFooter,
} from "@/components/ui/emoji-picker"

const EMOJI_SIZE = 44
const PADDING = 8

interface EmojiTrayProps {
  onSelectEmoji: (emoji: string) => void
}

export function EmojiTray({ onSelectEmoji }: EmojiTrayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(10)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width - PADDING * 2
      setColumns(Math.max(1, Math.floor(width / EMOJI_SIZE)))
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="h-full w-full">
      <EmojiPicker
        className="h-full w-full"
        columns={columns}
        onEmojiSelect={(emoji) => onSelectEmoji(emoji.emoji)}
      >
        <EmojiPickerSearch placeholder="Search emojis…" />
        <EmojiPickerContent />
        <EmojiPickerFooter />
      </EmojiPicker>
    </div>
  )
}
