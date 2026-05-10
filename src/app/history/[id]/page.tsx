"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import type { InterviewSession } from "@/types"

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/history/${id}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled && data.session) setSession(data.session) })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this interview record?")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" })
      if (res.ok) router.push("/history")
    } catch (e) {
      console.error("Failed to delete:", e)
    } finally {
      setDeleting(false)
    }
  }, [id, router])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="glass rounded-2xl p-8 w-full max-w-2xl animate-pulse h-96" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="glass rounded-2xl p-12 text-center space-y-4">
          <p className="text-zinc-500">Session not found.</p>
          <button onClick={() => router.push("/history")} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
            Back to history
          </button>
        </div>
      </div>
    )
  }

  const avgScore = session.summary?.overallScore ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold capitalize bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {session.mode === "conversation"
              ? (session.topic ?? "Conversation")
              : `${session.industry} Interview`
            }
          </h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/50 text-zinc-500 capitalize">{session.mode}</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/history")}
            className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xl font-bold shadow-sm">
            {Math.round(avgScore)}
          </div>
          <div className="text-sm text-zinc-500 space-y-1">
            <p>Mode: <span className="capitalize font-medium text-zinc-700">{session.mode}</span></p>
            {session.industry && <p>Industry: <span className="capitalize font-medium text-zinc-700">{session.industry}</span></p>}
            {session.topic && <p>Topic: <span className="capitalize font-medium text-zinc-700">{session.topic}</span></p>}
            <p>Level: <span className="capitalize font-medium text-zinc-700">{session.difficulty}</span></p>
            <p>Date: <span className="text-zinc-700">{new Date(session.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span></p>
            <p>Messages: <span className="text-zinc-700">{session.messages.length}</span></p>
          </div>
        </div>
      </div>

      {session.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {session.summary.strengths?.length > 0 && (
            <div className="bg-green-50/60 rounded-xl p-4 border border-green-200/50">
              <p className="text-sm font-semibold text-green-800 mb-2">Strengths</p>
              <ul className="space-y-1">
                {session.summary.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-green-700">&#10003; {s}</li>
                ))}
              </ul>
            </div>
          )}
          {session.summary.improvements?.length > 0 && (
            <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200/50">
              <p className="text-sm font-semibold text-amber-800 mb-2">Areas to Improve</p>
              <ul className="space-y-1">
                {session.summary.improvements.map((s, i) => (
                  <li key={i} className="text-sm text-amber-700">&#8593; {s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {session.messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl p-4 ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm"
                  : "glass"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
