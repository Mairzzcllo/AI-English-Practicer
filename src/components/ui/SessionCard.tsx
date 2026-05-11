"use client"

import type { SessionSummary } from "@/hooks/useSessionList"

export function SessionCard({
  session,
  onClick,
  onDelete,
  deleting,
}: {
  session: SessionSummary
  onClick: (id: string) => void
  onDelete: (id: string, e: React.MouseEvent) => void
  deleting: string | null
}) {
  return (
    <div
      className="glass rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-white/80 transition-all group"
      onClick={() => onClick(session._id)}
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
        onClick={(e) => onDelete(session._id, e)}
        disabled={deleting === session._id}
        className="p-2 rounded-xl text-zinc-300 hover:text-red-500 hover:bg-red-50/50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
        title="Delete"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}
