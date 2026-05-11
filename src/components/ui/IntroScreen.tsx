import type { Mode, Industry, Difficulty, Topic } from "@/types"
import { LANGUAGES, SPEECH_RATES } from "@/lib/constants"
import { MicPermissionBanner } from "@/components/ui/MicPermissionBanner"

export function IntroScreen({
  mode,
  industry,
  topic,
  difficulty,
  selectedLang,
  speechRate,
  micPermission,
  error,
  sttSupported,
  sttError,
  loading,
  onStart,
  onLangChange,
  onRateChange,
}: {
  mode: Mode
  industry: Industry
  topic: Topic | null
  difficulty: Difficulty
  selectedLang: string
  speechRate: number
  micPermission: PermissionState | null
  error: string | null
  sttSupported: boolean
  sttError: string | null
  loading: boolean
  onStart: () => void
  onLangChange: (value: string) => void
  onRateChange: (value: number) => void
}) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-md">
        <div className="glass rounded-2xl p-8 text-center space-y-6">
          <div className="space-y-2">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              {mode === "interview"
                ? `${industry!.charAt(0).toUpperCase() + industry!.slice(1)} · ${difficulty}`
                : `${topic ?? "Free Talk"} · ${difficulty}`}
            </div>
            <h1 className="text-2xl font-bold mt-4">
              {mode === "interview" ? "Ready to Practice?" : "Let's Talk!"}
            </h1>
            <p className="text-zinc-500 text-sm leading-relaxed">
              {mode === "interview"
                ? "A 15-minute conversational interview. Speak naturally — the AI will listen, respond, and guide the discussion."
                : "A relaxed 15-minute conversation. Speak naturally, and the AI will keep the discussion flowing."}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-zinc-500 font-medium w-20 text-left">
                Language
              </label>
              <select
                value={selectedLang}
                onChange={(e) => onLangChange(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-zinc-500 font-medium w-20 text-left">
                Speed
              </label>
              <select
                value={speechRate}
                onChange={(e) => onRateChange(Number(e.target.value))}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {SPEECH_RATES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <MicPermissionBanner state={micPermission} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {!sttSupported && (
            <p className="text-red-500 text-sm">{sttError}</p>
          )}

          <button
            onClick={onStart}
            disabled={loading}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {loading
              ? "Starting..."
              : mode === "interview"
                ? "Begin Interview"
                : "Start Talking"}
          </button>
        </div>
      </div>
    </div>
  )
}
