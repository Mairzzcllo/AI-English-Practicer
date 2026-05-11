import type { Mode } from "@/types"
import { ScoreCircle } from "@/components/ui/ScoreCircle"
import { StrengthsImprovements } from "@/components/ui/StrengthsImprovements"

export function EndedScreen({
  mode,
  summary,
  onBackHome,
  onViewHistory,
}: {
  mode: Mode
  summary: Record<string, unknown> | null
  onBackHome: () => void
  onViewHistory: () => void
}) {
  return (
    <div className="flex flex-1 flex-col min-h-0 items-center pt-6 pb-4">
      <div className="w-full max-w-lg flex flex-col flex-1 min-h-0">
        <h1 className="shrink-0 text-center text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent pb-4">
          {mode === "interview"
            ? "Interview Complete"
            : "Conversation Complete"}
        </h1>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="glass rounded-2xl p-8 space-y-6">
            <div className="text-center">
              <ScoreCircle score={(summary?.overallScore as number) ?? 0} />
            </div>
            <p className="text-zinc-600 text-center text-sm">
              {summary?.summary as string}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/50 rounded-xl p-4 text-center">
                <div className="text-lg font-semibold text-zinc-800">
                  {(summary?.duration as number) ?? 0}s
                </div>
                <div className="text-xs text-zinc-400">Duration</div>
              </div>
              <div className="bg-white/50 rounded-xl p-4 text-center">
                <div className="text-lg font-semibold text-zinc-800">
                  {(summary?.totalMessages as number) ?? 0}
                </div>
                <div className="text-xs text-zinc-400">Messages</div>
              </div>
            </div>
            <StrengthsImprovements
              strengths={(summary?.strengths as string[]) ?? []}
              improvements={(summary?.improvements as string[]) ?? []}
            />
          </div>
        </div>
        <div className="shrink-0 flex gap-3 pt-4">
          <button
            onClick={onBackHome}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all active:scale-[0.98]"
          >
            Back to Home
          </button>
          <button
            onClick={onViewHistory}
            className="flex-1 py-3 rounded-xl glass font-medium hover:bg-white/80 transition-all"
          >
            View History
          </button>
        </div>
      </div>
    </div>
  )
}
