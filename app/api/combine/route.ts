import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { a, b } = await req.json()

  if (!a || !b) {
    return NextResponse.json({ error: "missing emojis" }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 })
  }

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 64,
    messages: [
      {
        role: "user",
        content: `You are an emoji alchemist. Combine these two emojis into a single new emoji that represents what you'd get by mixing them. Be creative and playful.

Emoji A: ${a}
Emoji B: ${b}

Respond with ONLY a JSON object in this exact format (no markdown, no explanation):
{"emoji":"<single emoji>","name":"<2-3 word name>"}`,
      },
    ],
  })

  const text = message.content[0].type === "text" ? message.content[0].text.trim() : ""

  try {
    const result = JSON.parse(text)
    return NextResponse.json(result)
  } catch {
    const match = text.match(/\p{Emoji}/u)
    if (match) {
      return NextResponse.json({ emoji: match[0], name: "mystery blend" })
    }
    return NextResponse.json({ error: "unexpected response" }, { status: 500 })
  }
}
