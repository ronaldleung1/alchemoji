"use client"

import Link from "next/link"
import dynamic from "next/dynamic"

const ThemeToggle = dynamic(() => import("@/components/theme-toggle"), { ssr: false })

export default function Home() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-10">
      <ThemeToggle />

      <div className="flex flex-col items-center gap-3">
        <span className="text-5xl">🧪</span>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">alchemoji</h1>
        <p className="text-muted-foreground text-sm">play with emojis. combine them. make something new.</p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/studio"
          className="rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          studio
        </Link>
        <Link
          href="/alchemy"
          className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
        >
          alchemy
        </Link>
        <Link
          href="/gallery"
          className="rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          gallery
        </Link>
      </div>
    </div>
  )
}
