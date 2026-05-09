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

    await completeSession(sessionId)

    const adapter = createAiAdapter()
    const answeredQuestions = session.questions
      .filter((q) => q.userAnswer && q.feedback)
      .map((q) => ({
        question: q.question,
        userAnswer: q.userAnswer,
        feedback: q.feedback!,
      }))

    let summary = { overallScore: 0, summary: "Interview completed." }
    if (answeredQuestions.length > 0) {
      summary = await adapter.generateSummary(answeredQuestions)
    }

    return NextResponse.json({
      summary: {
        totalQuestions: session.questions.length,
        avgScore:
          answeredQuestions.reduce((acc, q) => acc + (q.feedback.overallScore ?? 0), 0) /
          Math.max(answeredQuestions.length, 1),
        duration: session.questions.reduce((acc, q) => acc + q.duration, 0),
        ...summary,
      },
    })
  } catch (error) {
    console.error("Failed to end interview:", error)
    return NextResponse.json({ error: "Failed to end interview" }, { status: 500 })
  }
}
