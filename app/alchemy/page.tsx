"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"

const ThemeToggle = dynamic(() => import("@/components/theme-toggle"), { ssr: false })

interface Emoji {
  emoji: string
  name: string
}

const POOL: Emoji[] = [
  { emoji: "🍕", name: "pizza" }, { emoji: "🐸", name: "frog" }, { emoji: "🎸", name: "guitar" },
  { emoji: "🚀", name: "rocket" }, { emoji: "🍄", name: "mushroom" }, { emoji: "🦋", name: "butterfly" },
  { emoji: "🌊", name: "wave" }, { emoji: "🎩", name: "top hat" }, { emoji: "🐙", name: "octopus" },
  { emoji: "🍦", name: "ice cream" }, { emoji: "⚡", name: "lightning" }, { emoji: "🦊", name: "fox" },
  { emoji: "🎪", name: "circus" }, { emoji: "🌈", name: "rainbow" }, { emoji: "🦴", name: "bone" },
  { emoji: "🍋", name: "lemon" }, { emoji: "🎭", name: "theater" }, { emoji: "🐉", name: "dragon" },
  { emoji: "🧲", name: "magnet" }, { emoji: "🪸", name: "coral" }, { emoji: "🫧", name: "bubbles" },
  { emoji: "🌵", name: "cactus" }, { emoji: "🎺", name: "trumpet" }, { emoji: "🦑", name: "squid" },
  { emoji: "🍩", name: "donut" }, { emoji: "🪄", name: "wand" }, { emoji: "🌙", name: "moon" },
  { emoji: "🐚", name: "shell" }, { emoji: "🎲", name: "dice" }, { emoji: "🫀", name: "heart" },
  { emoji: "🪨", name: "rock" }, { emoji: "🧸", name: "teddy" }, { emoji: "🦜", name: "parrot" },
  { emoji: "🍰", name: "cake" }, { emoji: "🌋", name: "volcano" }, { emoji: "🐝", name: "bee" },
  { emoji: "🎯", name: "target" }, { emoji: "🪻", name: "flower" }, { emoji: "🧊", name: "ice" },
  { emoji: "🦈", name: "shark" },
]

function pickRandom(pool: Emoji[], n: number): Emoji[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

const SLOT_EMPTY = null

export default function AlchemyPage() {
  const [discovered, setDiscovered] = useState<Emoji[]>([])

  useEffect(() => {
    setDiscovered(pickRandom(POOL, 5))
  }, [])
  const [slotA, setSlotA] = useState<Emoji | null>(SLOT_EMPTY)
  const [slotB, setSlotB] = useState<Emoji | null>(SLOT_EMPTY)
  const [result, setResult] = useState<Emoji | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectEmoji = useCallback(
    (emoji: Emoji) => {
      if (!slotA) {
        setSlotA(emoji)
        setResult(null)
        setError(null)
      } else if (!slotB) {
        setSlotB(emoji)
        setResult(null)
        setError(null)
      } else {
        setSlotA(emoji)
        setSlotB(null)
        setResult(null)
        setError(null)
      }
    },
    [slotA, slotB]
  )

  const combine = useCallback(async () => {
    if (!slotA || !slotB) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch("/api/combine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a: slotA.emoji, b: slotB.emoji }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const newEmoji: Emoji = { emoji: data.emoji, name: data.name }
      setResult(newEmoji)

      setDiscovered((prev) => {
        if (prev.some((e) => e.emoji === newEmoji.emoji)) return prev
        return [...prev, newEmoji]
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong")
    } finally {
      setLoading(false)
    }
  }, [slotA, slotB])

  const reset = useCallback(() => {
    setSlotA(null)
    setSlotB(null)
    setResult(null)
    setError(null)
  }, [])

  return (
    <div className="relative flex h-full flex-col">
      <ThemeToggle />

      {/* back link */}
      <div className="absolute top-4 left-4 z-10">
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
          ← home
        </Link>
      </div>

      {/* combining workspace */}
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <div className="flex items-center gap-4">
          {/* slot A */}
          <Slot item={slotA} onClick={() => { setSlotA(null); setResult(null) }} />

          <span className="text-muted-foreground text-2xl font-light">+</span>

          {/* slot B */}
          <Slot item={slotB} onClick={() => { setSlotB(null); setResult(null) }} />

          <span className="text-muted-foreground text-2xl font-light">=</span>

          {/* result */}
          <div className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30">
            {loading ? (
              <span className="text-muted-foreground animate-pulse text-2xl">✨</span>
            ) : result ? (
              <>
                <span className="text-3xl">{result.emoji}</span>
                <span className="text-muted-foreground mt-1 text-center text-[10px] leading-tight">{result.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground/40 text-xs">result</span>
            )}
          </div>
        </div>

        {error && (
          <p className="text-destructive text-xs">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={combine}
            disabled={!slotA || !slotB || loading}
            className="rounded-lg bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80 disabled:opacity-30"
          >
            {loading ? "combining…" : "combine"}
          </button>
          <button
            onClick={reset}
            className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            reset
          </button>
        </div>
      </div>

      {/* emoji collection */}
      <div className="border-t border-border bg-muted/30 px-6 py-5">
        <p className="text-muted-foreground mb-3 text-xs uppercase tracking-widest">
          discovered · {discovered.length}
        </p>
        <div className="flex flex-wrap gap-2">
          {discovered.map((item) => (
            <button
              key={item.emoji}
              onClick={() => selectEmoji(item)}
              title={item.name}
              className="group flex flex-col items-center gap-0.5 rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-background"
            >
              <span className="text-2xl leading-none">{item.emoji}</span>
              <span className="text-muted-foreground text-[9px] leading-none">{item.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Slot({ item, onClick }: { item: { emoji: string; name: string } | null; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl border border-border bg-background transition-colors hover:bg-muted"
    >
      {item ? (
        <>
          <span className="text-3xl">{item.emoji}</span>
          <span className="text-muted-foreground mt-1 text-center text-[10px] leading-tight">{item.name}</span>
        </>
      ) : (
        <span className="text-muted-foreground/40 text-xs">pick</span>
      )}
    </button>
  )
}
