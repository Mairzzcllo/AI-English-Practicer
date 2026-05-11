"use client"

import { useState, useEffect } from "react"

export function useMicPermission() {
  const [micPermission, setMicPermission] = useState<PermissionState | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!navigator.permissions?.query) {
      setTimeout(() => { if (!cancelled) setMicPermission("granted") }, 0)
      return
    }
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        if (cancelled) return
        setMicPermission(status.state)
        status.addEventListener("change", () => {
          if (!cancelled) setMicPermission(status.state)
        })
      })
      .catch(() => { if (!cancelled) setMicPermission("granted") })
    return () => { cancelled = true }
  }, [])

  return micPermission
}
