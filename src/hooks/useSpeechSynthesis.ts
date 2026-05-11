"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export interface UseSpeechSynthesisOptions {
  lang?: string
  rate?: number
  pitch?: number
  volume?: number
}

export interface UseSpeechSynthesisReturn {
  speak: (text: string) => Promise<void>
  cancel: () => void
  isSpeaking: boolean
  isSupported: boolean
}

export function useSpeechSynthesis(
  options: UseSpeechSynthesisOptions = {}
): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSupported] = useState(
    () => typeof window !== "undefined" && "speechSynthesis" in window
  )

  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  })

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) {
        resolve()
        return
      }

      const { lang = "en-US", rate = 0.9, pitch = 1, volume = 1 } =
        optionsRef.current

      window.speechSynthesis.cancel()
      setIsSpeaking(true)

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = rate
      utterance.pitch = pitch
      utterance.volume = volume

      utterance.onend = () => {
        setIsSpeaking(false)
        resolve()
      }
      utterance.onerror = () => {
        setIsSpeaking(false)
        resolve()
      }

      window.speechSynthesis.speak(utterance)
    })
  }, [])

  return {
    speak,
    cancel,
    isSpeaking,
    isSupported,
  }
}
