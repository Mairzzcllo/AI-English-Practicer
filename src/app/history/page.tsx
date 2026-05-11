"use client"

import { useRouter } from "next/navigation"
import { SessionCard } from "@/components/ui/SessionCard"
import { SkeletonList } from "@/components/ui/SkeletonList"
import { EmptyHistory } from "@/components/ui/EmptyHistory"
import { useSessionList } from "@/hooks/useSessionList"

export default function HistoryPage() {
  const router = useRouter()
  const { sessions, loading, deleting, handleDelete } = useSessionList()

  return (
    <div className="flex flex-col flex-1 min-h-0 py-8">
      <div className="flex items-center justify-between shrink-0 pb-6">
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

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {loading && <SkeletonList />}

        {!loading && sessions.length === 0 && (
          <EmptyHistory onAction={() => router.push("/")} />
        )}

        {!loading && sessions.length > 0 && (
          <>
            {sessions.map((session) => (
              <SessionCard
                key={session._id}
                session={session}
                onClick={(id) => router.push(`/history/${id}`)}
                onDelete={(id, e) => handleDelete(id, e)}
                deleting={deleting}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
