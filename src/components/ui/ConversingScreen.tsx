import { type RefObject } from "react"
import type { Mode, Industry, Difficulty, Topic } from "@/types"
import { LANGUAGES } from "@/lib/constants"
import { MessageBubble } from "@/components/ui/MessageBubble"
import { AudioVisualizer } from "@/components/ui/AudioVisualizer"

export function ConversingScreen({
  mode,
  industry,
  topic,
  difficulty,
  selectedLang,
  error,
  messages,
  displayTranscript,
  interimTranscript,
  messagesEndRef,
  isListening,
  isAiSpeaking,
  isSubmitting,
  loading,
  timeLeft,
  formatTime,
  onEndInterview,
}: {
  mode: Mode
  industry: Industry
  topic: Topic | null
  difficulty: Difficulty
  selectedLang: string
  error: string | null
  messages: { role: string; content: string }[]
  displayTranscript: string
  interimTranscript: string
  messagesEndRef: RefObject<HTMLDivElement | null>
  isListening: boolean
  isAiSpeaking: boolean
  isSubmitting: boolean
  loading: boolean
  timeLeft: number
  formatTime: (t: number) => string
  onEndInterview: () => void
}) {
  return (
    <div className="flex flex-1 min-h-0">
      <aside className="w-64 shrink-0 pr-4">
        <div className="glass rounded-2xl p-5 space-y-5">
          <div className="space-y-2">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              {mode === "interview"
                ? industry!.charAt(0).toUpperCase() + industry!.slice(1)
                : topic ?? "Free Talk"}
            </div>
            <div className="text-xs text-zinc-500 capitalize font-medium">{difficulty}</div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/50 text-zinc-500 capitalize">{mode}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/50 text-zinc-500">
                {LANGUAGES.find((l) => l.value === selectedLang)?.label ?? selectedLang}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/20 text-center space-y-1">
            <div
              className={`text-3xl font-mono font-bold tracking-tight ${
                timeLeft < 60 ? "text-red-500" : "text-zinc-700"
              }`}
            >
              {formatTime(timeLeft)}
            </div>
            <div className="text-xs text-zinc-400">remaining</div>
          </div>

          <button
            onClick={onEndInterview}
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-red-500 hover:bg-red-50/50 border border-transparent hover:border-red-200/50 transition-all disabled:opacity-50"
          >
            End Session
          </button>
        </div>
      </aside>

      <div className="flex flex-1 min-h-0 flex-col">
        {error && (
          <div className="mb-3 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 shrink-0">
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 mb-4 pr-1">
          {messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role as "user" | "ai"} content={msg.content} />
          ))}

          {displayTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl p-4 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 text-indigo-900 border border-indigo-200/50">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {displayTranscript}
                  {interimTranscript && (
                    <span className="text-zinc-400">{interimTranscript}</span>
                  )}
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="glass rounded-xl px-4 py-3 flex items-center gap-3 text-sm shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <span className="relative flex w-2.5 h-2.5">
              {isListening && !isAiSpeaking ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-red-500" />
                </>
              ) : (
                <span className="inline-flex rounded-full w-2.5 h-2.5 bg-zinc-300" />
              )}
            </span>
            <span className="text-zinc-500">
              {isAiSpeaking
                ? "AI is speaking..."
                : isSubmitting
                  ? "Processing..."
                  : isListening
                    ? "Listening — speak naturally"
                    : "Not listening"}
            </span>
          </div>
          {isListening && (
            <AudioVisualizer isActive={isListening && !isAiSpeaking} />
          )}
        </div>
      </div>
    </div>
  )
}
