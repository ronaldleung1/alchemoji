"use client"

import { useState } from "react"
import { EMOJI_CATEGORIES, type EmojiCategory } from "@/lib/emoji-defaults"

interface EmojiTrayProps {
  onSelectEmoji: (emoji: string) => void
}

const categories = Object.keys(EMOJI_CATEGORIES) as EmojiCategory[]

export function EmojiTray({ onSelectEmoji }: EmojiTrayProps) {
  const [activeCategory, setActiveCategory] = useState<EmojiCategory>(
    categories[0]
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-border px-3 py-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-wrap gap-1">
          {EMOJI_CATEGORIES[activeCategory].map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              onClick={() => onSelectEmoji(emoji)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl transition-colors hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
