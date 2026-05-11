"use client"

import type { InterviewSession } from "@/types"
import { ScoreCircle } from "@/components/ui/ScoreCircle"

export function SessionMetaCard({
  session,
  avgScore,
}: {
  session: InterviewSession
  avgScore: number
}) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-6">
        <div className="text-center">
          <ScoreCircle score={avgScore} size="sm" />
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
  )
}
