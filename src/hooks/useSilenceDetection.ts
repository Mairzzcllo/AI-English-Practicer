"use client"

import { useRef, useCallback, useEffect, useState } from "react"

export interface UseSilenceDetectionOptions {
  threshold?: number
  pollingInterval?: number
  onSilence?: () => void
}

export interface UseSilenceDetectionReturn {
  reportActivity: () => void
  isSilent: boolean
  reset: () => void
  destroy: () => void
}

export function useSilenceDetection(
  options: UseSilenceDetectionOptions = {}
): UseSilenceDetectionReturn {
  const { threshold = 2500, pollingInterval = 500 } = options

  const [isSilent, setIsSilent] = useState(false)
  const lastActivityRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)
  const onSilenceRef = useRef(options.onSilence)

  useEffect(() => {
    onSilenceRef.current = options.onSilence
  })

  useEffect(() => {
    lastActivityRef.current = Date.now()
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const reportActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    setIsSilent(false)
  }, [])

  const destroy = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    destroy()
    intervalRef.current = setInterval(() => {
      if (!mountedRef.current) return
      const elapsed = Date.now() - lastActivityRef.current

      if (elapsed > threshold) {
        setIsSilent((prev) => {
          if (!prev) onSilenceRef.current?.()
          return true
        })
      } else {
        setIsSilent(false)
      }
    }, pollingInterval)
  }, [destroy, pollingInterval, threshold])

  const reset = useCallback(() => {
    destroy()
    lastActivityRef.current = Date.now()
    setIsSilent(false)
    start()
  }, [destroy, start])

  useEffect(() => {
    start()
    return destroy
  }, [start, destroy])

  return {
    reportActivity,
    isSilent,
    reset,
    destroy,
  }
}
