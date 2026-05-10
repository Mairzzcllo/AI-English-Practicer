import { NextRequest, NextResponse } from "next/server"
import { createAiAdapter } from "@/lib/ai"
import { getSession, addMessage } from "@/lib/store"

export async function POST(req: NextRequest) {
  try {
    const { sessionId, transcript } = await req.json()

    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    await addMessage(sessionId, {
      role: "user",
      content: transcript,
      createdAt: new Date(),
    })

    const conversation = [
      ...session.messages.map(m => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: transcript },
    ]

    const adapter = createAiAdapter()
    const response = await adapter.generateConversationResponse(
      conversation,
      session.mode,
      session.difficulty,
      session.industry,
      session.topic
    )

    await addMessage(sessionId, {
      role: "ai",
      content: response.content,
      createdAt: new Date(),
    })

    return NextResponse.json({
      message: { role: "ai", content: response.content },
      shouldEnd: response.shouldEnd,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    console.error("Failed to process conversation:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
