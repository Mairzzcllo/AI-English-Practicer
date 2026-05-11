"use client"

import { useParams, useRouter } from "next/navigation"
import { SessionMetaCard } from "@/components/ui/SessionMetaCard"
import { NotFoundState } from "@/components/ui/NotFoundState"
import { MessageBubble } from "@/components/ui/MessageBubble"
import { StrengthsImprovements } from "@/components/ui/StrengthsImprovements"
import { useSessionDetail } from "@/hooks/useSessionDetail"

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { session, loading, deleting, handleDelete } = useSessionDetail(id)

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
        <NotFoundState onBack={() => router.push("/history")} />
      </div>
    )
  }

  const avgScore = session.summary?.overallScore ?? 0

  return (
    <div className="flex-1 min-h-0 overflow-y-auto py-8">
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

      <SessionMetaCard session={session} avgScore={avgScore} />

      {session.summary && (
        <StrengthsImprovements
          strengths={session.summary.strengths ?? []}
          improvements={session.summary.improvements ?? []}
        />
      )}

      <div className="space-y-4">
        {session.messages.map((msg, i) => (
          <MessageBubble key={i} role={msg.role === "user" ? "user" : "ai"} content={msg.content} />
        ))}
      </div>
      </div>
    </div>
  )
}
