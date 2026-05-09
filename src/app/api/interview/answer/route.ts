import { NextRequest, NextResponse } from "next/server"
import { createAiAdapter } from "@/lib/ai"
import { getSession, updateQuestion } from "@/lib/store"

export async function POST(req: NextRequest) {
  try {
    const { sessionId, questionId, userAnswer } = await req.json()

    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const question = session.questions.find((q) => q.questionId === questionId)
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    const adapter = createAiAdapter()
    const feedback = await adapter.generateFeedback(question.question, userAnswer)

    await updateQuestion(sessionId, questionId, userAnswer, feedback)

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error("Failed to process answer:", error)
    return NextResponse.json({ error: "Failed to process answer" }, { status: 500 })
  }
}
