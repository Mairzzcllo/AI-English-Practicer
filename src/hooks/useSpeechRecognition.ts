"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export type RecognitionErrorType =
  | "not-supported"
  | "not-allowed"
  | "no-speech"
  | "aborted"
  | "audio-capture"
  | "network"
  | "language-not-supported"
  | "service-not-allowed"
  | "unknown"

export interface UseSpeechRecognitionOptions {
  lang?: string
  continuous?: boolean
  interimResults?: boolean
  autoRestart?: boolean
  maxRestartAttempts?: number
  restartDelay?: number
  onResult?: (text: string) => void
  onInterimResult?: (text: string) => void
  onError?: (type: RecognitionErrorType, message: string) => void
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean
  isSupported: boolean
  error: string | null
  errorType: RecognitionErrorType | null
  startListening: () => void
  stopListening: () => void
}

const ERROR_MESSAGES: Record<RecognitionErrorType, string> = {
  "not-supported": "Speech recognition not supported. Please use Chrome.",
  "not-allowed":
    "Microphone access denied. Please allow microphone access in your browser settings.",
  "no-speech": "No speech detected.",
  "aborted": "Speech recognition was interrupted.",
  "audio-capture": "No microphone found. Please check your microphone.",
  "network": "Network error. Please check your connection.",
  "language-not-supported": "The selected language is not supported.",
  "service-not-allowed": "Speech recognition service is not allowed.",
  "unknown": "An unknown error occurred.",
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<RecognitionErrorType | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const restartAttemptsRef = useRef(0)
  const mountedRef = useRef(true)
  const intentionallyStoppedRef = useRef(false)
  const startListeningRef = useRef<() => void>(() => {})

  const onResultRef = useRef(options.onResult)
  const onInterimResultRef = useRef(options.onInterimResult)
  const onErrorRef = useRef(options.onError)

  useEffect(() => {
    onResultRef.current = options.onResult
    onInterimResultRef.current = options.onInterimResult
    onErrorRef.current = options.onError
  })

  useEffect(() => {
    return () => {
      mountedRef.current = false
      recognitionRef.current?.stop()
    }
  }, [])

  const mapError = useCallback(
    (e: string | SpeechRecognitionErrorEvent): RecognitionErrorType => {
      const err = typeof e === "string" ? e : e.error
      switch (err) {
        case "no-speech":
          return "no-speech"
        case "aborted":
          return "aborted"
        case "audio-capture":
          return "audio-capture"
        case "network":
          return "network"
        case "not-allowed":
          return "not-allowed"
        case "service-not-allowed":
          return "service-not-allowed"
        case "language-not-supported":
          return "language-not-supported"
        default:
          return "unknown"
      }
    },
    []
  )

  const stopListening = useCallback(() => {
    intentionallyStoppedRef.current = true
    restartAttemptsRef.current = 0
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch { /* ignore */ }
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  const startListening = useCallback(() => {
    const {
      lang = "en-US",
      continuous = true,
      interimResults = true,
      autoRestart = true,
      maxRestartAttempts = 5,
      restartDelay = 1000,
    } = options

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      setIsSupported(false)
      const msg = ERROR_MESSAGES["not-supported"]
      setError(msg)
      setErrorType("not-supported")
      onErrorRef.current?.("not-supported", msg)
      return
    }

    intentionallyStoppedRef.current = false

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch { /* ignore */ }
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = lang
    recognition.continuous = continuous
    recognition.interimResults = interimResults

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      restartAttemptsRef.current = 0

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
        onResultRef.current?.(final)
      }
      if (interim) {
        onInterimResultRef.current?.(interim)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!mountedRef.current) return
      const type = mapError(event)
      const msg = ERROR_MESSAGES[type]
      setError(msg)
      setErrorType(type)
      setIsListening(false)
      onErrorRef.current?.(type, msg)

      if (
        autoRestart &&
        type !== "not-supported" &&
        type !== "not-allowed" &&
        type !== "service-not-allowed" &&
        restartAttemptsRef.current < maxRestartAttempts
      ) {
        restartAttemptsRef.current++
        const delay =
          restartDelay * Math.pow(2, restartAttemptsRef.current - 1)
        setTimeout(() => {
          if (mountedRef.current) startListeningRef.current()
        }, delay)
      }
    }

    recognition.onend = () => {
      if (!mountedRef.current) return
      setIsListening(false)

      if (!intentionallyStoppedRef.current && autoRestart) {
        setTimeout(() => {
          if (mountedRef.current) startListeningRef.current()
        }, restartDelay)
      }
    }

    try {
      recognition.start()
      recognitionRef.current = recognition
      setIsListening(true)
      setError(null)
      setErrorType(null)
    } catch (e) {
      const msg = String(e)
      setError(msg)
      setErrorType("unknown")
      onErrorRef.current?.("unknown", msg)
    }
  }, [options, mapError])

  useEffect(() => {
    startListeningRef.current = startListening
  })

  return {
    isListening,
    isSupported,
    error,
    errorType,
    startListening,
    stopListening,
  }
}
