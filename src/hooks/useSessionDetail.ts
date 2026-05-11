"use client"

import { useState, useEffect, useCallback } from "react"
import type { InterviewSession } from "@/types"

export function useSessionDetail(id: string) {
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [loading, setLoading] = useState(!!id)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetch(`/api/history/${id}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled && data.session) setSession(data.session) })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this interview record?")) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" })
      if (res.ok) window.location.href = "/history"
    } catch (e) {
      console.error("Failed to delete:", e)
    } finally {
      setDeleting(false)
    }
  }, [id])

  return { session, loading, deleting, handleDelete }
}
