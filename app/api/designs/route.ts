import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const FILE = path.join(process.cwd(), "data", "designs.json")

async function readDesigns() {
  try {
    const raw = await fs.readFile(FILE, "utf-8")
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeDesigns(designs: unknown[]) {
  await fs.writeFile(FILE, JSON.stringify(designs, null, 2))
}

export async function GET() {
  const designs = await readDesigns()
  return NextResponse.json(designs)
}

export async function POST(req: Request) {
  const { name, canvases } = await req.json()

  if (!name?.trim() || !Array.isArray(canvases)) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 })
  }

  const designs = await readDesigns()

  const design = {
    id: crypto.randomUUID(),
    name: name.trim(),
    canvases,
    savedAt: new Date().toISOString(),
  }

  designs.unshift(design)
  await writeDesigns(designs)

  return NextResponse.json(design, { status: 201 })
}
