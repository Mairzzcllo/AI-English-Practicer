"use client"

import { useRef, useCallback, useState } from "react"

export interface UseAiVoiceFilterReturn {
  setAiSpeaking: (text: string) => void
  setAiStopped: () => void
  shouldFilter: (userTranscript: string) => boolean
  isAiSpeaking: boolean
}

const OVERLAP_THRESHOLD = 0.6

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\w\s]/g, "").trim()
}

function wordOverlapRatio(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(Boolean))
  const wordsB = b.split(/\s+/).filter(Boolean)
  if (wordsA.size === 0 || wordsB.length === 0) return 0

  let overlap = 0
  for (const w of wordsB) {
    if (wordsA.has(w)) overlap++
  }
  return overlap / wordsB.length
}

export function useAiVoiceFilter(): UseAiVoiceFilterReturn {
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)
  const lastAiTextRef = useRef("")

  const setAiSpeaking = useCallback((text: string) => {
    const normalized = normalize(text)
    lastAiTextRef.current = normalized
    setIsAiSpeaking(true)
  }, [])

  const setAiStopped = useCallback(() => {
    setIsAiSpeaking(false)
  }, [])

  const shouldFilter = useCallback(
    (userTranscript: string): boolean => {
      if (!isAiSpeaking) return false

      const norm = normalize(userTranscript)
      const aiText = lastAiTextRef.current

      if (!norm || !aiText) return false

      const ratio = wordOverlapRatio(aiText, norm)
      return ratio > OVERLAP_THRESHOLD
    },
    [isAiSpeaking]
  )

  return {
    setAiSpeaking,
    setAiStopped,
    shouldFilter,
    isAiSpeaking,
  }
}
