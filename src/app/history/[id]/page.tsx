"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import type { InterviewSession } from "@/types"

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/history/${id}`)
        const data = await res.json()
        if (res.ok) setSession(data.session)
      } catch (e) {
        console.error("Failed to fetch session:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchSession()
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-zinc-500">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-zinc-500">Session not found.</p>
      </div>
    )
  }

  const answeredQuestions = session.questions.filter((q) => q.feedback)
  const avgScore =
    answeredQuestions.reduce((acc, q) => acc + (q.feedback?.overallScore ?? 0), 0) /
    Math.max(answeredQuestions.length, 1)

  return (
    <div className="flex flex-1 flex-col p-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold capitalize">{session.industry} Interview</h1>
        <button
          onClick={() => router.push("/history")}
          className="text-sm text-zinc-500 hover:text-zinc-900 underline"
        >
          Back
        </button>
      </div>

      <div className="bg-zinc-50 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <span className="text-4xl font-bold">{Math.round(avgScore)}</span>
            <span className="text-zinc-500">/100</span>
          </div>
          <div className="text-sm text-zinc-600 space-y-1">
            <p>Difficulty: <span className="capitalize">{session.difficulty}</span></p>
            <p>Date: {new Date(session.createdAt).toLocaleDateString()}</p>
            <p>Questions: {session.questions.length}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {session.questions.map((q) => (
          <div key={q.questionId} className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3">
            <p className="font-medium">{q.question}</p>
            {q.userAnswer && (
              <div>
                <p className="text-xs text-zinc-400 uppercase mb-1">Your answer</p>
                <p className="text-sm text-zinc-700">{q.userAnswer}</p>
              </div>
            )}
            {q.feedback && (
              <div className="bg-zinc-50 rounded-lg p-3 space-y-2 text-sm">
                <p className="text-green-700 font-medium">
                  Score: {q.feedback.overallScore}/100
                </p>
                {(q.feedback.grammar ?? []).length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Grammar</p>
                    {(q.feedback.grammar ?? []).map((g, i) => (
                      <p key={i} className="text-zinc-700">• {g}</p>
                    ))}
                  </div>
                )}
                {(q.feedback.wordChoice ?? []).length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Word Choice</p>
                    {(q.feedback.wordChoice ?? []).map((w, i) => (
                      <p key={i} className="text-zinc-700">• {w}</p>
                    ))}
                  </div>
                )}
                <p className="text-zinc-600 italic">{q.feedback.suggestion}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
