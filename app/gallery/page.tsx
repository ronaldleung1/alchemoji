"use client"

import Link from "next/link"
import { useGallery } from "@/lib/gallery"
import { GalleryCard } from "@/components/gallery-card"

export default function GalleryPage() {
  const { items } = useGallery()

  return (
    <div className="h-full overflow-auto bg-muted dark:bg-background">
      <div className="mx-auto w-full max-w-5xl px-6 pb-16 pt-20">
        <h1 className="font-heading mb-6 text-2xl font-semibold tracking-tight">
          Gallery
        </h1>

        {items.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
            <p className="text-muted-foreground">No published pieces yet.</p>
            <p className="text-sm text-muted-foreground">
              Publish a canvas from the{" "}
              <Link href="/" className="underline underline-offset-4 hover:text-foreground">
                editor
              </Link>{" "}
              to see it here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {items.map((item) => (
              <GalleryCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
