"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { Industry, Difficulty } from "@/types"

const industries: { value: Industry; label: string }[] = [
  { value: "tech", label: "Technology" },
  { value: "marketing", label: "Marketing" },
  { value: "management", label: "Management" },
]

const difficulties: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
]

export default function Home() {
  const router = useRouter()
  const [industry, setIndustry] = useState<Industry>("tech")
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate")

  const startInterview = () => {
    const params = new URLSearchParams({ industry, difficulty })
    router.push(`/interview?${params.toString()}`)
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">AI Mock Interview</h1>
          <p className="text-zinc-500">Practice English interviews with AI feedback</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Industry</label>
            <div className="grid grid-cols-3 gap-2">
              {industries.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setIndustry(value)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    industry === value
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {difficulties.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setDifficulty(value)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    difficulty === value
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startInterview}
            className="w-full py-3 rounded-lg bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors"
          >
            Start Interview
          </button>
        </div>

        <div className="text-center">
          <Link href="/history" className="text-sm text-zinc-500 hover:text-zinc-900 underline">
            View history
          </Link>
        </div>
      </div>
    </div>
  )
}
