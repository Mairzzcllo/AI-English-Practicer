"use client"

import { Suspense, useState, useRef, useCallback, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import type { Mode, Industry, Difficulty, Topic } from "@/types"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis"
import { useSilenceDetection } from "@/hooks/useSilenceDetection"
import { useAiVoiceFilter } from "@/hooks/useAiVoiceFilter"
import { IntroScreen } from "@/components/ui/IntroScreen"
import { EndedScreen } from "@/components/ui/EndedScreen"
import { ConversingScreen } from "@/components/ui/ConversingScreen"
import { useTimer } from "@/hooks/useTimer"
import { useMicPermission } from "@/hooks/useMicPermission"

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
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [displayTranscript, setDisplayTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [speechRate, setSpeechRate] = useState(0.9)

  const transcriptRef = useRef("")
  const submittedRef = useRef("")
  const sessionIdRef = useRef<string | null>(null)
  const isSubmittingRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const endInterviewRef = useRef<() => Promise<void>>(async () => {})

  useEffect(() => { isSubmittingRef.current = isSubmitting }, [isSubmitting])

  const aiFilter = useAiVoiceFilter()
  const tts = useSpeechSynthesis({ lang: "en-US", rate: speechRate })

  const stt = useSpeechRecognition({
    lang: "en-US",
    onResult: (text) => {
      if (aiFilter.shouldFilter(text)) return
      transcriptRef.current += text
      setDisplayTranscript(transcriptRef.current)
      silenceDetect.reportActivity()
      if (aiFilter.isAiSpeaking) tts.cancel()
    },
    onInterimResult: (text) => setInterimTranscript(text),
    onError: (_, msg) => setError(msg),
  })

  const submitSegment = useCallback(
    async (text: string) => {
      const sid = sessionIdRef.current
      if (!sid || !text.trim() || isSubmittingRef.current) return
      setIsSubmitting(true)
      try {
        setMessages((prev) => [...prev, { role: "user", content: text }])
        const res = await fetch("/api/interview/talk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid, transcript: text }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "Failed to get response")

        setMessages((prev) => [
          ...prev,
          { role: "ai", content: data.message.content },
        ])
        aiFilter.setAiSpeaking(data.message.content)
        await tts.speak(data.message.content)
        aiFilter.setAiStopped()
        if (data.shouldEnd) endInterviewRef.current()
      } catch (e) {
        console.error("Failed to submit:", e)
      } finally {
        setIsSubmitting(false)
      }
    },
    [tts.speak, aiFilter.setAiSpeaking, aiFilter.setAiStopped]
  )

  const handleSilence = useCallback(() => {
    if (!sessionIdRef.current || isSubmittingRef.current) return
    const full = transcriptRef.current
    const submitted = submittedRef.current
    if (full.length > submitted.length) {
      const newText = full.slice(submitted.length).trim()
      if (newText) {
        submittedRef.current = full
        submitSegment(newText)
      }
    }
  }, [submitSegment])

  const silenceDetect = useSilenceDetection({
    threshold: 2500,
    pollingInterval: 500,
    onSilence: handleSilence,
  })

  const endInterview = useCallback(async () => {
    const sid = sessionIdRef.current
    if (!sid) return
    setLoading(true)
    tts.cancel()
    stt.stopListening()
    silenceDetect.destroy()
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
  }, [tts.cancel, stt.stopListening, silenceDetect.destroy])

  useEffect(() => { endInterviewRef.current = endInterview }, [endInterview])

  const { timeLeft, formatTime } = useTimer({
    initialSeconds: 15 * 60,
    active: phase === "conversing",
    onExpire: () => endInterviewRef.current(),
  })

  const micPermission = useMicPermission()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, displayTranscript, interimTranscript])

  useEffect(() => {
    return () => {
      tts.cancel()
    }
  }, [tts.cancel])

  const startSession = useCallback(async () => {
    setLoading(true)
    setError(null)
    transcriptRef.current = ""
    submittedRef.current = ""
    sessionIdRef.current = null
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

      aiFilter.setAiSpeaking(data.message.content)
      await tts.speak(data.message.content)
      aiFilter.setAiStopped()

      stt.startListening()
    } catch (e) {
      console.error("Failed to start:", e)
      setError(e instanceof Error ? e.message : "Failed to start")
    } finally {
      setLoading(false)
    }
  }, [
    mode,
    industry,
    topic,
    difficulty,
    tts.speak,
    stt.startListening,
    aiFilter.setAiSpeaking,
    aiFilter.setAiStopped,
  ])

  if (phase === "intro") {
    return (
      <IntroScreen
        mode={mode}
        industry={industry}
        topic={topic}
        difficulty={difficulty}
        speechRate={speechRate}
        micPermission={micPermission}
        error={error}
        sttSupported={stt.isSupported}
        sttError={stt.error}
        loading={loading}
        onStart={startSession}
        onRateChange={setSpeechRate}
      />
    )
  }

  if (phase === "ended") {
    return (
      <EndedScreen
        mode={mode}
        summary={summary}
        onBackHome={() => router.push("/")}
        onViewHistory={() => router.push("/history")}
      />
    )
  }

  return (
      <ConversingScreen
        mode={mode}
        industry={industry}
        topic={topic}
        difficulty={difficulty}
        error={error}
        messages={messages}
        displayTranscript={displayTranscript}
        interimTranscript={interimTranscript}
        messagesEndRef={messagesEndRef}
        isListening={stt.isListening}
        isAiSpeaking={aiFilter.isAiSpeaking}
        isSubmitting={isSubmitting}
        loading={loading}
        timeLeft={timeLeft}
        formatTime={formatTime}
        onEndInterview={endInterview}
      />
  )
}

export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-zinc-500">Loading...</p>
        </div>
      }
    >
      <InterviewContent />
    </Suspense>
  )
}
