"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { Mode, Industry, Difficulty, Topic } from "@/types"

const modes: { value: Mode; label: string; desc: string }[] = [
  { value: "interview", label: "Mock Interview", desc: "Practice job interviews" },
  { value: "conversation", label: "Free Talk", desc: "Casual English conversation" },
]

const industries: { value: Industry; label: string }[] = [
  { value: "tech", label: "Technology" },
  { value: "marketing", label: "Marketing" },
  { value: "management", label: "Management" },
]

const topics: { value: Topic; label: string }[] = [
  { value: "travel", label: "Travel" },
  { value: "technology", label: "Technology" },
  { value: "culture", label: "Culture" },
  { value: "food", label: "Food" },
  { value: "sports", label: "Sports" },
  { value: "music", label: "Music" },
  { value: "education", label: "Education" },
  { value: "career", label: "Career" },
]

const difficulties: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
]

export default function Home() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("interview")
  const [industry, setIndustry] = useState<Industry>("tech")
  const [topic, setTopic] = useState<Topic>("travel")
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate")

  const start = () => {
    const params = new URLSearchParams({ mode, difficulty })
    if (mode === "interview") params.set("industry", industry)
    else params.set("topic", topic)
    router.push(`/interview?${params.toString()}`)
  }

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="glass rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              TalkEasy AI
            </h1>
            <p className="text-zinc-500">Practice English through real conversations</p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-600">Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {modes.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    className={`p-3 rounded-xl text-left transition-all ${
                      mode === value
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                        : "bg-white/60 text-zinc-600 hover:bg-white/80 border border-white/30"
                    }`}
                  >
                    <div className="text-sm font-medium">{label}</div>
                    <div className={`text-xs mt-0.5 ${mode === value ? "text-white/70" : "text-zinc-400"}`}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {mode === "interview" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-600">Industry</label>
                <div className="grid grid-cols-3 gap-2">
                  {industries.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setIndustry(value)}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                        industry === value
                          ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                          : "bg-white/60 text-zinc-600 hover:bg-white/80 border border-white/30"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-600">Topic</label>
                <div className="grid grid-cols-2 gap-2">
                  {topics.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setTopic(value)}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                        topic === value
                          ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                          : "bg-white/60 text-zinc-600 hover:bg-white/80 border border-white/30"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-600">Level</label>
              <div className="grid grid-cols-3 gap-2">
                {difficulties.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setDifficulty(value)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                      difficulty === value
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                        : "bg-white/60 text-zinc-600 hover:bg-white/80 border border-white/30"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={start}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition-all active:scale-[0.98]"
            >
              {mode === "interview" ? "Start Interview" : "Start Conversation"}
            </button>
          </div>
        </div>

        <div className="text-center">
          <Link href="/history" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">
            View history
          </Link>
        </div>
      </div>
    </div>
  )
}
