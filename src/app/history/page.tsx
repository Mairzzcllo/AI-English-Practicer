"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface SessionSummary {
  _id: string
  industry: string
  difficulty: string
  createdAt: string
}

export default function HistoryPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/history")
        const data = await res.json()
        if (res.ok) setSessions(data.sessions ?? [])
      } catch (e) {
        console.error("Failed to fetch history:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  return (
    <div className="flex flex-1 flex-col p-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Interview History</h1>
        <button
          onClick={() => router.push("/")}
          className="text-sm text-zinc-500 hover:text-zinc-900 underline"
        >
          Back
        </button>
      </div>

      {loading && <p className="text-zinc-500 text-center py-12">Loading...</p>}

      {!loading && sessions.length === 0 && (
        <p className="text-zinc-500 text-center py-12">No interviews yet.</p>
      )}

      <div className="space-y-3">
        {sessions.map((session) => (
          <button
            key={session._id}
            onClick={() => router.push(`/history/${session._id}`)}
            className="w-full text-left bg-white border border-zinc-200 rounded-xl p-4 hover:border-zinc-400 transition-colors"
          >
            <div className="font-medium capitalize">{session.industry}</div>
            <div className="text-sm text-zinc-500 capitalize">{session.difficulty}</div>
            <div className="text-xs text-zinc-400 mt-1">
              {new Date(session.createdAt).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
