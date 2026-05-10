import { NextRequest, NextResponse } from "next/server"
import { createAiAdapter } from "@/lib/ai"
import { getSession, completeSession } from "@/lib/store"

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()

    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const adapter = createAiAdapter()
    const summary = await adapter.generateSummary(
      session.messages.map(m => ({ role: m.role, content: m.content })),
      session.mode,
      session.difficulty,
      session.industry,
      session.topic
    )

    await completeSession(sessionId, summary)

    const duration = session.startedAt
      ? Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000)
      : 0

    return NextResponse.json({
      summary: {
        ...summary,
        duration,
        totalMessages: session.messages.length,
      },
    })
  } catch (error) {
    console.error("Failed to end:", error)
    return NextResponse.json({ error: "Failed to end" }, { status: 500 })
  }
}
