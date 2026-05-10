"use client"

import { Suspense, useState, useRef, useCallback, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import type { Mode, Industry, Difficulty, Topic } from "@/types"

type Phase = "intro" | "conversing" | "ended"

function InterviewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mode = (searchParams.get("mode") ?? "interview") as Mode
  const industry = (searchParams.get("industry") ?? "tech") as Industry
  const topic = (searchParams.get("topic") ?? null) as Topic | null
  const difficulty = (searchParams.get("difficulty") ?? "intermediate") as Difficulty

  const [phase, setPhase] = useState<Phase>("intro")
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [loading, setLoading] = useState(false)
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)
  const [timeLeft, setTimeLeft] = useState(15 * 60)
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const transcriptRef = useRef("")
  const submittedRef = useRef("")
  const lastSpeechRef = useRef<number>(0)
  const sessionIdRef = useRef<string | null>(null)
  const isSubmittingRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const silenceIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const endInterviewRef = useRef<() => Promise<void>>(async () => {})
  const isAiSpeakingRef = useRef(false)
  const stopAiSpeakingRef = useRef<() => void>(() => {})
  const lastAiTextRef = useRef("")

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`

  const speakText = useCallback((text: string): Promise<void> => {
    lastAiTextRef.current = text.toLowerCase().replace(/[^\w\s]/g, "").trim()
    return new Promise(resolve => {
      if (!("speechSynthesis" in window)) { resolve(); return }
      setIsAiSpeaking(true)
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "en-US"
      utterance.rate = 0.9
      utterance.onend = () => { setIsAiSpeaking(false); resolve() }
      utterance.onerror = () => { setIsAiSpeaking(false); resolve() }
      window.speechSynthesis.speak(utterance)
    })
  }, [])

  const stopAiSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsAiSpeaking(false)
  }, [])

  const endInterview = useCallback(async () => {
    const sid = sessionIdRef.current
    if (!sid) return
    setLoading(true)
    stopAiSpeaking()
    try {
      const res = await fetch("/api/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      })
      const data = await res.json()
      if (res.ok) setSummary(data.summary)
    } catch (e) {
      console.error("Failed to end:", e)
    } finally {
      setLoading(false)
      setPhase("ended")
    }
  }, [stopAiSpeaking])

  useEffect(() => { isSubmittingRef.current = isSubmitting }, [isSubmitting])
  useEffect(() => { isAiSpeakingRef.current = isAiSpeaking }, [isAiSpeaking])
  useEffect(() => { stopAiSpeakingRef.current = stopAiSpeaking }, [stopAiSpeaking])
  useEffect(() => { endInterviewRef.current = endInterview }, [endInterview])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, transcript, interimTranscript])

  useEffect(() => {
    if (phase !== "conversing") return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          endInterviewRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  const submitSegment = useCallback(async (text: string) => {
    const sid = sessionIdRef.current
    if (!sid || !text.trim() || isSubmittingRef.current) return
    setIsSubmitting(true)
    try {
      setMessages(prev => [...prev, { role: "user", content: text }])
      const res = await fetch("/api/interview/talk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, transcript: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to get response")
      setMessages(prev => [...prev, { role: "ai", content: data.message.content }])
      await speakText(data.message.content)
      if (data.shouldEnd) endInterviewRef.current()
    } catch (e) {
      console.error("Failed to submit:", e)
    } finally {
      setIsSubmitting(false)
    }
  }, [speakText])

  const submitSegmentRef = useRef(submitSegment)
  useEffect(() => { submitSegmentRef.current = submitSegment }, [submitSegment])

  const startListening = useCallback(() => {
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      setError("Speech recognition not supported. Please use Chrome.")
      return
    }
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionAPI()
    recognition.lang = "en-US"
    recognition.interimResults = true
    recognition.continuous = true

    const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, "").trim()

    recognition.onresult = (event) => {
      let final = ""
      let interim = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript
        } else {
          interim += event.results[i][0].transcript
        }
      }
      if (final) {
        if (isAiSpeakingRef.current) {
          const norm = normalize(final)
          const aiText = lastAiTextRef.current
          if (norm.length > 0 && aiText.length > 0 && (aiText.includes(norm) || norm.includes(aiText))) {
            setInterimTranscript(interim)
            return
          }
        }
        transcriptRef.current += final
        setTranscript(transcriptRef.current)
        lastSpeechRef.current = Date.now()
        if (isAiSpeakingRef.current) stopAiSpeakingRef.current()
      }
      setInterimTranscript(interim)
    }

    recognition.onerror = () => {
      setInterimTranscript("")
    }

    recognition.start()
    recognitionRef.current = recognition
  }, [])

  const startSession = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { mode, difficulty }
      if (mode === "interview") body.industry = industry
      else if (topic) body.topic = topic

      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to start")
      sessionIdRef.current = data.sessionId
      setMessages([data.message])
      setPhase("conversing")
      await speakText(data.message.content)
      startListening()

      silenceIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - lastSpeechRef.current
        if (elapsed > 2500 && !isSubmittingRef.current && sessionIdRef.current) {
          const full = transcriptRef.current
          const submitted = submittedRef.current
          if (full.length > submitted.length) {
            const newText = full.slice(submitted.length).trim()
            if (newText) {
              submittedRef.current = full
              submitSegmentRef.current(newText)
            }
          }
        }
      }, 1000)
    } catch (e) {
      console.error("Failed to start:", e)
      setError(e instanceof Error ? e.message : "Failed to start")
    } finally {
      setLoading(false)
    }
  }, [mode, industry, topic, difficulty, speakText, startListening])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
      if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (phase === "intro") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md">
          <div className="glass rounded-2xl p-8 text-center space-y-6">
            <div className="space-y-2">
              <div className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                {mode === "interview"
                  ? `${industry!.charAt(0).toUpperCase() + industry!.slice(1)} · ${difficulty}`
                  : `${topic ?? "Free Talk"} · ${difficulty}`
                }
              </div>
              <h1 className="text-2xl font-bold mt-4">
                {mode === "interview" ? "Ready to Practice?" : "Let's Talk!"}
              </h1>
              <p className="text-zinc-500 text-sm leading-relaxed">
                {mode === "interview"
                  ? "A 15-minute conversational interview. Speak naturally — the AI will listen, respond, and guide the discussion."
                  : "A relaxed 15-minute conversation. Speak naturally, and the AI will keep the discussion flowing."
                }
              </p>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              onClick={startSession}
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {loading ? "Starting..." : mode === "interview" ? "Begin Interview" : "Start Talking"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === "ended") {
    return (
      <div className="flex flex-1 items-start justify-center pt-8">
        <div className="w-full max-w-lg space-y-6">
          <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {mode === "interview" ? "Interview Complete" : "Conversation Complete"}
          </h1>
          <div className="glass rounded-2xl p-8 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-3xl font-bold shadow-lg mb-3">
                {Math.round((summary?.overallScore as number) ?? 0)}
              </div>
              <div className="text-xs text-zinc-400">/100</div>
            </div>
            <p className="text-zinc-600 text-center text-sm">{summary?.summary as string}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/50 rounded-xl p-4 text-center">
                <div className="text-lg font-semibold text-zinc-800">{summary?.duration as number}s</div>
                <div className="text-xs text-zinc-400">Duration</div>
              </div>
              <div className="bg-white/50 rounded-xl p-4 text-center">
                <div className="text-lg font-semibold text-zinc-800">{summary?.totalMessages as number}</div>
                <div className="text-xs text-zinc-400">Messages</div>
              </div>
            </div>
            {(summary?.strengths as string[] ?? []).length > 0 && (
              <div className="bg-green-50/60 rounded-xl p-4 border border-green-200/50">
                <p className="text-sm font-semibold text-green-800 mb-2">Strengths</p>
                <ul className="space-y-1">
                  {(summary?.strengths as string[] ?? []).map((s, i) => (
                    <li key={i} className="text-sm text-green-700">&#10003; {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {(summary?.improvements as string[] ?? []).length > 0 && (
              <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200/50">
                <p className="text-sm font-semibold text-amber-800 mb-2">Areas to Improve</p>
                <ul className="space-y-1">
                  {(summary?.improvements as string[] ?? []).map((s, i) => (
                    <li key={i} className="text-sm text-amber-700">&#8593; {s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/")}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all active:scale-[0.98]"
            >
              Back to Home
            </button>
            <button
              onClick={() => router.push("/history")}
              className="flex-1 py-3 rounded-xl glass font-medium hover:bg-white/80 transition-all"
            >
              View History
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="glass rounded-2xl p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            {mode === "interview"
              ? industry!.charAt(0).toUpperCase() + industry!.slice(1)
              : topic ?? "Free Talk"
            }
          </div>
          <span className="text-xs text-zinc-400">·</span>
          <span className="text-xs text-zinc-500 capitalize">{difficulty}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/40 text-zinc-500 capitalize">{mode}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-sm font-mono font-bold ${
            timeLeft < 60 ? "bg-red-50 text-red-600" : "bg-white/60 text-zinc-600"
          }`}>
            {formatTime(timeLeft)}
          </div>
          <button
            onClick={endInterview}
            disabled={loading}
            className="text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            End
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl p-4 ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm"
                  : "glass rounded-2xl"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {transcript && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl p-4 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 text-indigo-900 border border-indigo-200/50">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {transcript}
                {interimTranscript && <span className="text-zinc-400">{interimTranscript}</span>}
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="glass rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
        <span className="relative flex w-2.5 h-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-red-500" />
        </span>
        <span className="text-zinc-500">
          {isAiSpeaking
            ? "AI is speaking..."
            : isSubmitting
              ? "Processing..."
              : "Listening — speak naturally"}
        </span>
      </div>
    </div>
  )
}

export default function InterviewPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center p-8"><p className="text-zinc-500">Loading...</p></div>}>
      <InterviewContent />
    </Suspense>
  )
}
