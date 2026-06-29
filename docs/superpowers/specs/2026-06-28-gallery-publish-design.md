# Gallery & Publish — Design

**Date:** 2026-06-28
**Status:** Approved (design), pending implementation plan

## Summary

Add a Gallery to Alchemoji. Users publish a canvas from the editor; the
published piece appears in a read-only Gallery view. Navigation between the
Editor and Gallery uses a Fluid Functionalism segmented-control Tabs component.
Everything is local (localStorage) for now; auth/remote storage is a later
phase and explicitly out of scope here.

## Goals

- A Gallery view that displays read-only versions of published canvases.
- A "Publish" action available per-canvas in the editor.
- Soft client-side navigation between Editor and Gallery (no full page refresh).
- Inline download on hover for each gallery piece (no dropdown menu).

## Non-Goals (YAGNI)

- Authentication / accounts.
- Remote/cloud storage or a shared public gallery.
- Descriptions, titles, alt text, tags, or any metadata beyond a timestamp.
- Editing or re-opening a published piece in the editor.
- Reordering, liking, or commenting on gallery pieces.

## Decisions (resolved with user)

| Question | Decision |
|---|---|
| Navigation | Real Next.js routes (`/`, `/gallery`) with soft client navigation. |
| Publish model | Frozen snapshot — deep-copy stickers at publish time; re-publish = new entry. |
| Gallery hover actions | Download only (inline, no dropdown). |
| Tab bar placement | Floating segmented control, top-center, above the canvas. |

## Architecture

### Routing

- Editor stays at `/` (`app/page.tsx`), behavior unchanged.
- New `app/gallery/page.tsx` renders the Gallery.
- `components/tab-nav.tsx` is a client component rendered once in
  `app/layout.tsx`, positioned fixed/absolute at top-center.
  - Renders Fluid Functionalism `Tabs` (`TabsList` + `TabItem`) as a segmented
    control with labels "Editor" and "Gallery".
  - Active tab is derived from `usePathname()` (`/` → Editor, `/gallery` →
    Gallery).
  - `onValueChange` (or `onSelect`) calls `router.push()` for soft navigation —
    no full reload. Uses `next/navigation`.
  - We use only `TabsList` + `TabItem` as a nav control; `TabPanel` is not used
    because content is route-driven.
- The editor unmounts when navigating to `/gallery` and remounts on return.
  Canvases persist via localStorage and rehydrate; in-session undo/redo history
  and the current selection reset. This is acceptable for this phase.

### Data layer — `lib/gallery.ts`

- localStorage key: `emoji-alchemy:gallery`.
- Type: `GalleryItem = { id: string; stickers: StickerData[]; publishedAt: number }`.
  - `stickers` reuses the existing `StickerData` type from `components/sticker`.
- `useGallery()` hook backed by `useSyncExternalStore` plus a `storage`-event
  subscription, so:
  - publishing in the editor reflects immediately when navigating to Gallery,
  - cross-tab updates are picked up.
- API:
  - `items: GalleryItem[]` (newest first).
  - `publish(stickers: StickerData[]): void` — deep-copies stickers (fresh
    sticker ids not required since they're inert; copy values to avoid shared
    references), prepends a new `GalleryItem` with `crypto.randomUUID()` id and
    `Date.now()`.
  - `remove(id: string): void` — used internally / future; not surfaced in the
    hover UI for this phase.
- Read path mirrors the editor's defensive parsing in `app/page.tsx`: wrap
  `localStorage` access in try/catch, validate the parsed value is an array,
  discard corrupt data, and degrade to an empty gallery.

### Shared render util — `lib/render-canvas.ts` (refactor)

- Extract the PNG-rendering logic currently embedded in
  `components/download-button.tsx` (`buildCanvas`, `renderEmojiBitmap`, and the
  emoji ink-bounds math) into a pure module:
  - `renderStickersToCanvas(stickers: StickerData[]): HTMLCanvasElement | null`
- Depends on `CARD_W` / `CARD_H` (currently exported from
  `components/sticker-canvas.tsx`). Keep importing those constants from there to
  avoid moving them.
- Consumers:
  - `components/download-button.tsx` — download/copy/share use the util.
  - `components/gallery-card.tsx` — thumbnail + hover download use the util.
- This is a targeted refactor in service of the gallery, not unrelated cleanup:
  it removes duplication of the non-trivial ink-bounds rendering.

### Publish entry point

- Add a **Publish** `DropdownMenuItem` to the existing per-canvas "···" menu in
  `components/download-button.tsx`.
  - Disabled when the canvas is empty (same as Download/Copy).
  - Shows brief "Published!" confirmation with a check icon, mirroring the
    existing Copy feedback pattern (`copied` state, ~1.5s reset).
  - Calls `useGallery().publish(stickers)`.
  - Triggers a success haptic (`haptic("success")`).
- `download-button.tsx` gains a `stickers`-only dependency on the gallery hook;
  it already receives `stickers` as a prop.

### Gallery page — `app/gallery/page.tsx` + `components/gallery-card.tsx`

- `app/gallery/page.tsx` ("use client"):
  - Reads `items` from `useGallery()`.
  - Renders a responsive CSS grid of `GalleryCard`s.
  - Empty state: centered message "No published pieces yet — publish a canvas
    from the editor." (links/points back to `/`).
- `components/gallery-card.tsx` ("use client"):
  - Props: `item: GalleryItem`.
  - On mount, renders the snapshot to a PNG via
    `renderStickersToCanvas(item.stickers)` → `toDataURL()` (or object URL,
    revoked on unmount) and displays it in an `<img>` (read-only by nature).
  - Card styling consistent with the editor's canvas card (`bg-card`, rounded,
    border, shadow).
  - On hover: a single inline Download button fades in at top-right
    (`opacity-0 group-hover:opacity-100`), matching the editor card's hover
    affordance but with no dropdown. Click downloads the PNG (reusing the same
    rendered canvas/blob), filename `alchemoji.png`. Success haptic.

### UI component — `components/ui/tabs.tsx`

- Installed from the Fluid Functionalism registry:
  `npx shadcn@latest add https://www.fluidfunctionalism.com/r/base/tabs.json`
- Drop-in compatible with the existing shadcn theme/tokens (per FF docs).
- Note: FF font-weight animation prefers the Inter variable font; the app
  currently uses Public Sans / DM Sans. Acceptable — the slide/spring behavior
  still works; no font change required for this phase.

## Data flow

1. Editor → user opens a canvas's "···" menu → clicks **Publish**.
2. `publish(stickers)` deep-copies and prepends a `GalleryItem` to the
   `emoji-alchemy:gallery` localStorage array; `useSyncExternalStore` notifies
   subscribers.
3. User clicks the **Gallery** tab → `router.push("/gallery")` (soft nav).
4. `app/gallery/page.tsx` reads `items` and renders `GalleryCard`s; each renders
   its snapshot to a PNG.
5. Hovering a card reveals Download; clicking saves the PNG.

## Error handling

- localStorage read/write wrapped in try/catch (mirrors `app/page.tsx`).
  Corrupt gallery data is discarded; the gallery degrades to empty.
- `renderStickersToCanvas` returns `null` if a 2D context can't be obtained or
  there are no stickers; `GalleryCard` shows nothing/placeholder rather than
  crashing.
- Publishing an empty canvas is prevented at the UI level (disabled menu item).

## Testing

- Manual / smoke for this phase (the app has no test harness today):
  - Publish a canvas → appears in Gallery, newest first.
  - Edit the original canvas after publishing → gallery snapshot unchanged
    (frozen-snapshot verification).
  - Re-publish same canvas → second distinct entry.
  - Gallery hover → Download produces a PNG matching the editor download.
  - Tab switching does not full-reload (observe no white flash / network doc
    reload; React state in unaffected components persists where applicable).
  - Empty gallery shows the empty state.
  - Corrupt `emoji-alchemy:gallery` value → gallery loads empty, no crash.

## Files

New:
- `app/gallery/page.tsx`
- `components/tab-nav.tsx`
- `components/gallery-card.tsx`
- `lib/gallery.ts`
- `lib/render-canvas.ts`
- `components/ui/tabs.tsx` (from FF registry)

Edited:
- `app/layout.tsx` (mount `TabNav`)
- `components/download-button.tsx` (add Publish; use shared render util)

## Future (out of scope, noted for direction)

- Auth + remote storage for a real shared gallery.
- Per-piece metadata (title, alt text), remove/unpublish in the hover UI,
  opening a piece back into the editor.
