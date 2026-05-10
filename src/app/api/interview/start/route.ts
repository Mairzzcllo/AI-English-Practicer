import { NextRequest, NextResponse } from "next/server"
import { createAiAdapter } from "@/lib/ai"
import { createSession } from "@/lib/store"
import type { Mode, Industry, Difficulty, Topic } from "@/types"

export async function POST(req: NextRequest) {
  try {
    const { mode = "interview", industry, topic, difficulty } = await req.json() as {
      mode?: Mode
      industry?: Industry
      topic?: Topic
      difficulty: Difficulty
    }

    const adapter = createAiAdapter()
    const question = await adapter.generateOpeningQuestion(mode, difficulty, industry, topic)
    const message = { role: "ai" as const, content: question, createdAt: new Date() }
    const sessionId = await createSession({ mode, industry, topic, difficulty, firstMessage: message })

    return NextResponse.json({ sessionId, message })
  } catch (error) {
    console.error("Failed to start:", error)
    const message = error instanceof Error ? error.message : "Failed to start"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
