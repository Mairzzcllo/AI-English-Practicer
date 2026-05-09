import { NextRequest, NextResponse } from "next/server"
import { createAiAdapter } from "@/lib/ai"
import { createSession } from "@/lib/store"

export async function POST(req: NextRequest) {
  try {
    const { industry, difficulty } = await req.json()

    const adapter = createAiAdapter()
    const question = await adapter.generateQuestion(industry, difficulty, [])
    const sessionId = await createSession(industry, difficulty, question)

    return NextResponse.json({
      sessionId,
      question: { id: 1, text: question },
    })
  } catch (error) {
    console.error("Failed to start interview:", error)
    const message = error instanceof Error ? error.message : "Failed to start interview"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
