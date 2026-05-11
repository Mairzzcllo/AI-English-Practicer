"use client"

import { useState, useEffect, useCallback } from "react"

export interface SessionSummary {
  _id: string
  mode: string
  industry?: string
  topic?: string
  difficulty: string
  createdAt: string
  summary?: { overallScore: number }
}

export function useSessionList() {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setSessions(data.sessions ?? []) })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Delete this interview record?")) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" })
      if (res.ok) setSessions((prev) => prev.filter((s) => s._id !== id))
    } catch (e) {
      console.error("Failed to delete:", e)
    } finally {
      setDeleting(null)
    }
  }, [])

  return { sessions, loading, deleting, handleDelete }
}
