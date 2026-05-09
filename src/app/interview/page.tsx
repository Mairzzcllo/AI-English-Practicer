"use client"

import { Suspense, useState, useRef, useCallback, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import type { Industry, Difficulty, QuestionFeedback } from "@/types"

type Phase = "intro" | "answering" | "feedback" | "next" | "summary"

function InterviewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const industry = (searchParams.get("industry") ?? "tech") as Industry
  const difficulty = (searchParams.get("difficulty") ?? "intermediate") as Difficulty

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<{ id: number; text: string } | null>(null)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [feedback, setFeedback] = useState<QuestionFeedback | null>(null)
  const [phase, setPhase] = useState<Phase>("intro")
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)
  const [isListening, setIsListening] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const speakText = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "en-US"
      utterance.rate = 0.9
      window.speechSynthesis.speak(utterance)
    }
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsListening(false)
  }, [])

  const endInterview = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const res = await fetch("/api/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to end interview")
      setSummary(data.summary)
      setPhase("summary")
    } catch (e) {
      console.error("Failed to end interview:", e)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  const startInterview = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, difficulty }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start interview")
      }
      setSessionId(data.sessionId)
      setCurrentQuestion(data.question)
      setQuestionCount(1)
      speakText(data.question.text)
      setPhase("answering")
    } catch (e) {
      console.error("Failed to start interview:", e)
      alert(e instanceof Error ? e.message : "Failed to start interview. Check that MongoDB and AI provider are configured.")
    } finally {
      setLoading(false)
    }
  }, [industry, difficulty, speakText])

  const startListening = useCallback(() => {
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.")
      return
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionAPI()
    recognition.lang = "en-US"
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = ""
      let interim = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript
        } else {
          interim += event.results[i][0].transcript
        }
      }
      setTranscript((prev) => prev + final)
      setInterimTranscript(interim)
    }

    recognition.onerror = () => {
      setInterimTranscript("")
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }, [])

  const submitAnswer = useCallback(async () => {
    if (!sessionId || !currentQuestion || !transcript.trim()) return
    setLoading(true)
    stopListening()

    try {
      const res = await fetch("/api/interview/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.id,
          userAnswer: transcript,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to submit answer")
      setFeedback(data.feedback)
      setPhase("feedback")
    } catch (e) {
      console.error("Failed to submit answer:", e)
    } finally {
      setLoading(false)
    }
  }, [sessionId, currentQuestion, transcript, stopListening])

  const nextQuestion = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    setTranscript("")
    setInterimTranscript("")
    setFeedback(null)

    try {
      const res = await fetch("/api/interview/next-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, questionId: currentQuestion?.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to get next question")

      if (data.isComplete) {
        await endInterview()
      } else {
        setCurrentQuestion(data.question)
        setQuestionCount((n) => n + 1)
        speakText(data.question.text)
        setPhase("answering")
      }
    } catch (e) {
      console.error("Failed to get next question:", e)
    } finally {
      setLoading(false)
    }
  }, [sessionId, currentQuestion, speakText, endInterview])

  useEffect(() => {
    return () => {
      stopListening()
      window.speechSynthesis.cancel()
    }
  }, [stopListening])

  if (phase === "intro") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-bold">
            {industry.charAt(0).toUpperCase() + industry.slice(1)} · {difficulty}
          </h1>
          <p className="text-zinc-500 max-w-md">
            You will be asked 5 interview questions. Answer each question and get AI feedback.
          </p>
          <button
            onClick={startInterview}
            disabled={loading}
            className="px-8 py-3 rounded-lg bg-zinc-900 text-white font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Starting..." : "Begin Interview"}
          </button>
        </div>
      </div>
    )
  }

  if (phase === "summary") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-lg space-y-6">
          <h1 className="text-2xl font-bold text-center">Interview Complete</h1>
          <div className="bg-zinc-50 rounded-xl p-6 space-y-4">
            <div className="text-center">
              <span className="text-5xl font-bold">
                {Math.round((summary?.avgScore as number) ?? 0)}
              </span>
              <span className="text-zinc-500 ml-2">/100</span>
            </div>
            <p className="text-zinc-600 text-center">{summary?.summary as string}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-lg font-semibold">{summary?.totalQuestions as number}</div>
                <div className="text-zinc-500">Questions</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-lg font-semibold">{Math.round((summary?.duration as number) ?? 0)}s</div>
                <div className="text-zinc-500">Duration</div>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/")}
              className="flex-1 py-3 rounded-lg bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors"
            >
              Back to Home
            </button>
            <button
              onClick={() => router.push("/history")}
              className="flex-1 py-3 rounded-lg border border-zinc-200 font-medium hover:bg-zinc-50 transition-colors"
            >
              View History
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col p-4 md:p-8 max-w-2xl mx-auto w-full">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm text-zinc-500">Question {currentQuestion?.id} / 5</span>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i + 1 <= questionCount ? "bg-zinc-900" : "bg-zinc-200"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="bg-zinc-50 rounded-xl p-6 mb-4">
        <p className="text-lg font-medium">{currentQuestion?.text}</p>
      </div>

      {phase === "answering" && (
        <div className="flex-1 space-y-4">
          <div className="bg-white border border-zinc-200 rounded-xl p-4 min-h-[120px]">
            <p className="text-zinc-700">
              {transcript}
              {interimTranscript && (
                <span className="text-zinc-400">{interimTranscript}</span>
              )}
            </p>
            {!transcript && !interimTranscript && (
              <p className="text-zinc-400 text-sm">Your answer will appear here...</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={startListening}
              disabled={loading || isListening}
              className="flex-1 py-3 rounded-lg bg-zinc-900 text-white font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors"
            >
              Start Recording
            </button>
            <button
              onClick={stopListening}
              disabled={!isListening}
              className="py-3 px-6 rounded-lg border border-zinc-200 font-medium hover:bg-zinc-50 disabled:opacity-50 transition-colors"
            >
              Stop
            </button>
            <button
              onClick={submitAnswer}
              disabled={loading || !transcript.trim()}
              className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Submit Answer
            </button>
          </div>
        </div>
      )}

      {phase === "feedback" && feedback && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h3 className="font-semibold text-green-800 mb-2">Score: {feedback.overallScore}/100</h3>
            <p className="text-sm text-green-700">{feedback.suggestion}</p>
          </div>

          {(feedback.grammar ?? []).length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-xl p-4">
              <h3 className="font-semibold mb-2">Grammar</h3>
              <ul className="space-y-1">
                {(feedback.grammar ?? []).map((g, i) => (
                  <li key={i} className="text-sm text-zinc-700">• {g}</li>
                ))}
              </ul>
            </div>
          )}

          {(feedback.wordChoice ?? []).length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-xl p-4">
              <h3 className="font-semibold mb-2">Word Choice</h3>
              <ul className="space-y-1">
                {(feedback.wordChoice ?? []).map((w, i) => (
                  <li key={i} className="text-sm text-zinc-700">• {w}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={nextQuestion}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-zinc-900 text-white font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading..." : currentQuestion && currentQuestion.id >= 5 ? "Finish Interview" : "Next Question"}
          </button>
        </div>
      )}
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
