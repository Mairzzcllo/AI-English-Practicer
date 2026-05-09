import { NextRequest, NextResponse } from "next/server"
import { createAiAdapter } from "@/lib/ai"
import { getSession, pushQuestion } from "@/lib/store"

export async function POST(req: NextRequest) {
  try {
    const { sessionId, questionId } = await req.json()

    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const nextId = (questionId ?? session.questions.length) + 1

    if (nextId > 5) {
      return NextResponse.json({ isComplete: true })
    }

    const adapter = createAiAdapter()
    const previousQuestions = session.questions.map((q) => q.question)
    const question = await adapter.generateQuestion(
      session.industry,
      session.difficulty,
      previousQuestions
    )

    await pushQuestion(sessionId, {
      questionId: nextId,
      question,
      userAnswer: "",
      duration: 0,
      createdAt: new Date(),
    })

    return NextResponse.json({
      question: { id: nextId, text: question },
      isComplete: false,
    })
  } catch (error) {
    console.error("Failed to get next question:", error)
    return NextResponse.json({ error: "Failed to get next question" }, { status: 500 })
  }
}
