"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface SessionSummary {
  _id: string
  mode: string
  industry?: string
  topic?: string
  difficulty: string
  createdAt: string
  summary?: { overallScore: number }
}

export default function HistoryPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setSessions(data.sessions ?? []) })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Delete this interview record?")) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" })
      if (res.ok) setSessions((prev) => prev.filter((s) => s._id !== id))
    } catch (e) {
      console.error("Failed to delete:", e)
    } finally {
      setDeleting(null)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Interview History
        </h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Back
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-4 animate-pulse h-20" />
          ))}
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center space-y-3">
          <p className="text-zinc-500">No interviews yet.</p>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            Start your first interview
          </button>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session._id}
              className="glass rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-white/80 transition-all group"
              onClick={() => router.push(`/history/${session._id}`)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize text-zinc-800">
                    {session.mode === "conversation"
                      ? (session.topic ?? "Free Talk")
                      : (session.industry ?? "Interview")
                    }
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/50 text-zinc-500 capitalize">{session.mode}</span>
                </div>
                <div className="text-sm text-zinc-500 capitalize">{session.difficulty}</div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {new Date(session.createdAt).toLocaleDateString(undefined, {
                    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                  })}
                </div>
              </div>
              {session.summary?.overallScore != null && (
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-zinc-800">{Math.round(session.summary.overallScore)}</div>
                  <div className="text-xs text-zinc-400">/100</div>
                </div>
              )}
              <button
                onClick={(e) => handleDelete(session._id, e)}
                disabled={deleting === session._id}
                className="p-2 rounded-xl text-zinc-300 hover:text-red-500 hover:bg-red-50/50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
