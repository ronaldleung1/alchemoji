"use client"

import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="absolute right-3 top-3 z-50 rounded-md p-2.5 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground active:scale-[0.96]"
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "sun" : "moon"}
          initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
          transition={{ type: "spring", duration: 0.3, bounce: 0 }}
          className="flex"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
