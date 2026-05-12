import type { MemoryEvent, MemoryCategory } from "./types"
import { createMemoryEvent } from "./types"

export interface MemoryStore {
  events: MemoryEvent[]
}

export function createMemoryStore(): MemoryStore {
  return { events: [] }
}

export function storeEvent(store: MemoryStore, event: MemoryEvent): MemoryStore {
  return { events: [...store.events, event] }
}

export function retrieveByCategory(store: MemoryStore, category: MemoryCategory): MemoryEvent[] {
  return store.events.filter((e) => e.category === category)
}

export function retrieveByImportance(store: MemoryStore, minImportance: number): MemoryEvent[] {
  return store.events.filter((e) => e.importance >= minImportance)
}

export function retrieveRecent(store: MemoryStore, limit?: number): MemoryEvent[] {
  const sorted = [...store.events].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )
  return limit ? sorted.slice(0, limit) : sorted
}

export function searchMemory(store: MemoryStore, query: string): MemoryEvent[] {
  const lower = query.toLowerCase()
  return store.events.filter((e) => e.event.toLowerCase().includes(lower))
}

const EPHEMERAL_MAX_AGE_MINUTES = 60
const EPHEMERAL_LEVELS = ["ephemeral"] as const

export function compressEvents(store: MemoryStore, olderThanMinutes?: number): MemoryStore {
  const threshold = olderThanMinutes ?? EPHEMERAL_MAX_AGE_MINUTES
  const cutoff = Date.now() - threshold * 60 * 1000

  const filtered = store.events.filter((event) => {
    const isEphemeral = EPHEMERAL_LEVELS.includes(event.level as typeof EPHEMERAL_LEVELS[number])
    if (!isEphemeral) return true
    if (event.importance >= 0.7) return true
    return event.createdAt.getTime() >= cutoff
  })

  return { events: filtered }
}

const PREFERENCE_KEYWORDS = [
  "like", "love", "enjoy", "prefer", "favorite", "hate", "dislike",
  "interested", "good at", "bad at", "want to", "wish",
]

const KEY_EVENT_KEYWORDS = [
  "promoted", "graduated", "moved", "started", "got", "won",
  "interview", "job", "project", "achievement",
]

export function extractEventFromTurn(
  userMessage: string,
): MemoryEvent | null {
  const lower = userMessage.toLowerCase()
  const words = lower.split(/\s+/)
  if (words.length < 3) return null

  const isPreference = PREFERENCE_KEYWORDS.some((kw) => lower.includes(kw))
  if (isPreference) {
    return createMemoryEvent(userMessage.trim(), "user_preference", 0.3)
  }

  const isKeyEvent = KEY_EVENT_KEYWORDS.some((kw) => lower.includes(kw))
  if (isKeyEvent) {
    return createMemoryEvent(userMessage.trim(), "key_event", 0.6)
  }

  if (words.length >= 8) {
    return createMemoryEvent(userMessage.trim(), "conversation_behavior", 0.2)
  }

  return null
}

export function recallEvent(store: MemoryStore, eventId: string): MemoryEvent | null {
  const idx = store.events.map((e) => e.id).lastIndexOf(eventId)
  if (idx === -1) return null
  const event = store.events[idx]
  return {
    ...event,
    lastRecalledAt: new Date(),
    recallCount: event.recallCount + 1,
  }
}

export function getMostRecalled(store: MemoryStore, limit?: number): MemoryEvent[] {
  const sorted = [...store.events].sort((a, b) => b.recallCount - a.recallCount)
  return limit ? sorted.slice(0, limit) : sorted
}

export function findByImportanceRange(store: MemoryStore, min: number, max: number): MemoryEvent[] {
  return store.events.filter((e) => e.importance >= min && e.importance <= max)
}

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  user_fact: "User Facts",
  user_preference: "Preferences",
  relationship_history: "Relationship",
  emotional_pattern: "Emotions",
  behavioral_pattern: "Behavior",
  key_event: "Key Events",
  conversation_behavior: "Conversation",
}

export function getMemorySummary(store: MemoryStore): string {
  if (store.events.length === 0) return ""
  const categories = new Set(store.events.map((e) => e.category))
  const parts: string[] = []
  for (const cat of categories) {
    const events = retrieveByCategory(store, cat)
    const label = CATEGORY_LABELS[cat] ?? cat
    const items = events
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3)
      .map((e) => `- ${e.event} (importance: ${e.importance.toFixed(2)})`)
      .join("\n")
    parts.push(`${label}:\n${items}`)
  }
  return parts.join("\n\n")
}
