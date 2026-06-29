"use client"

import { usePathname, useRouter } from "next/navigation"
import { Wand2, Images } from "lucide-react"
import { Tabs, TabsList, TabItem } from "@/components/ui/tabs"

/**
 * Floating, top-center segmented control that switches between the editor (`/`)
 * and the gallery (`/gallery`). The active tab is derived from the current
 * pathname and selecting a tab performs a soft client navigation (no full
 * page reload).
 */
export function TabNav() {
  const pathname = usePathname()
  const router = useRouter()
  const value = pathname === "/gallery" ? "gallery" : "editor"

  const handleChange = (next: string) => {
    if (next === value) return
    router.push(next === "gallery" ? "/gallery" : "/")
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center">
      <div className="pointer-events-auto">
        <Tabs value={value} onValueChange={handleChange}>
          <TabsList>
            <TabItem value="editor" label="Editor" icon={Wand2} />
            <TabItem value="gallery" label="Gallery" icon={Images} />
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
