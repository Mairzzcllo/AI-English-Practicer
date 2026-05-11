"use client"

import { useState, useRef, useEffect, useCallback } from "react"

export function useTimer({
  initialSeconds,
  active,
  onExpire,
}: {
  initialSeconds: number
  active: boolean
  onExpire?: () => void
}) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const onExpireRef = useRef(onExpire)

  useEffect(() => { onExpireRef.current = onExpire }, [onExpire])

  useEffect(() => {
    if (!active) return
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          onExpireRef.current?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [active])

  const formatTime = useCallback((s: number) => {
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`
  }, [])

  return { timeLeft, formatTime }
}
