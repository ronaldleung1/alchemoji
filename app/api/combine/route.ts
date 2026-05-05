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
    max_tokens: 128,
    messages: [
      {
        role: "user",
        content: `You are a wildly creative emoji alchemist. When two emojis combine, the result should be surprising, poetic, or absurd — not the obvious answer. Think laterally: what unexpected concept, creature, feeling, or object emerges from this fusion?

Rules:
- Never return one of the input emojis as the result
- Avoid boring/predictable combinations (🍕+🔥 should NOT be 🍕🔥 or just "hot pizza")
- Favor weird, evocative, or funny outcomes
- The name should be 2-4 words, lowercase, creative

Emoji A: ${a}
Emoji B: ${b}

Respond with ONLY a JSON object, no markdown:
{"emoji":"<single emoji>","name":"<creative name>"}`,
      },
    ],
  })

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : ""
  // Strip markdown code fences if present
  const text = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim()

  try {
    const result = JSON.parse(text)
    return NextResponse.json(result)
  } catch {
    // Try to extract from malformed JSON
    const emojiMatch = text.match(/"emoji"\s*:\s*"([^"]+)"/)
    const nameMatch = text.match(/"name"\s*:\s*"([^"]+)"/)
    if (emojiMatch) {
      return NextResponse.json({ emoji: emojiMatch[1], name: nameMatch?.[1] ?? "mystery blend" })
    }
    return NextResponse.json({ error: "unexpected response" }, { status: 500 })
  }
}
