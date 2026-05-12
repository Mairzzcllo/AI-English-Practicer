import { describe, it, expect } from "vitest"
import {
  createMemoryStore,
  storeEvent,
  retrieveByCategory,
  retrieveByImportance,
  retrieveRecent,
  searchMemory,
  compressEvents,
  extractEventFromTurn,
  getMemorySummary,
  recallEvent,
  getMostRecalled,
  findByImportanceRange,
} from "./memory"
import { createMemoryEvent } from "./types"

function makeEvent(event: string, category: import("./types").MemoryCategory, importance: number) {
  return createMemoryEvent(event, category, importance)
}

describe("createMemoryStore", () => {
  it("creates an empty store", () => {
    const store = createMemoryStore()
    expect(store.events).toEqual([])
  })
})

describe("storeEvent", () => {
  it("adds an event to the store", () => {
    const store = createMemoryStore()
    const event = makeEvent("user likes python", "user_preference", 0.3)
    const result = storeEvent(store, event)
    expect(result.events).toHaveLength(1)
    expect(result.events[0].event).toBe("user likes python")
  })

  it("does not mutate original store", () => {
    const store = createMemoryStore()
    const event = makeEvent("test", "conversation_behavior", 0.5)
    storeEvent(store, event)
    expect(store.events).toHaveLength(0)
  })

  it("adds multiple events", () => {
    let store = createMemoryStore()
    store = storeEvent(store, makeEvent("e1", "conversation_behavior", 0.3))
    store = storeEvent(store, makeEvent("e2", "key_event", 0.8))
    expect(store.events).toHaveLength(2)
  })
})

describe("retrieveByCategory", () => {
  it("returns events of matching category", () => {
    let store = createMemoryStore()
    store = storeEvent(store, makeEvent("python", "user_preference", 0.3))
    store = storeEvent(store, makeEvent("got job", "key_event", 0.9))
    store = storeEvent(store, makeEvent("shy today", "emotional_pattern", 0.4))

    const prefs = retrieveByCategory(store, "user_preference")
    expect(prefs).toHaveLength(1)
    expect(prefs[0].event).toBe("python")
  })

  it("returns empty array when no match", () => {
    const store = createMemoryStore()
    expect(retrieveByCategory(store, "key_event")).toEqual([])
  })
})

describe("retrieveByImportance", () => {
  it("returns events above threshold", () => {
    let store = createMemoryStore()
    store = storeEvent(store, makeEvent("low", "conversation_behavior", 0.2))
    store = storeEvent(store, makeEvent("medium", "conversation_behavior", 0.5))
    store = storeEvent(store, makeEvent("high", "key_event", 0.9))
    expect(retrieveByImportance(store, 0.6)).toHaveLength(1)
    expect(retrieveByImportance(store, 0.2)).toHaveLength(3)
  })

  it("returns all events with threshold 0", () => {
    let store = createMemoryStore()
    store = storeEvent(store, makeEvent("a", "conversation_behavior", 0.1))
    store = storeEvent(store, makeEvent("b", "conversation_behavior", 0.2))
    expect(retrieveByImportance(store, 0)).toHaveLength(2)
  })
})

describe("retrieveRecent", () => {
  it("returns most recent events ordered by creation time", () => {
    let store = createMemoryStore()
    const e1 = { ...makeEvent("first", "conversation_behavior", 0.3), createdAt: new Date(Date.now() - 60000) }
    const e2 = { ...makeEvent("second", "conversation_behavior", 0.5), createdAt: new Date(Date.now() - 30000) }
    const e3 = { ...makeEvent("third", "key_event", 0.8), createdAt: new Date() }
    store = storeEvent(store, e1)
    store = storeEvent(store, e2)
    store = storeEvent(store, e3)
    const recent = retrieveRecent(store, 2)
    expect(recent).toHaveLength(2)
    expect(recent[0].event).toBe("third")
    expect(recent[1].event).toBe("second")
  })

  it("returns all events when limit not specified", () => {
    let store = createMemoryStore()
    store = storeEvent(store, makeEvent("a", "conversation_behavior", 0.3))
    store = storeEvent(store, makeEvent("b", "conversation_behavior", 0.5))
    expect(retrieveRecent(store)).toHaveLength(2)
  })
})

describe("searchMemory", () => {
  it("finds events by text match", () => {
    let store = createMemoryStore()
    store = storeEvent(store, makeEvent("user likes python programming", "user_preference", 0.4))
    store = storeEvent(store, makeEvent("user mentioned travel to Japan", "key_event", 0.7))
    const results = searchMemory(store, "python")
    expect(results).toHaveLength(1)
    expect(results[0].event).toContain("python")
  })

  it("returns empty array for no match", () => {
    const store = createMemoryStore()
    expect(searchMemory(store, "nonexistent")).toEqual([])
  })
})

describe("compressEvents", () => {
  it("does not remove recent events", () => {
    let store = createMemoryStore()
    store = storeEvent(store, makeEvent("recent event", "conversation_behavior", 0.3))
    const result = compressEvents(store)
    expect(result.events).toHaveLength(1)
  })

  it("removes ephemeral events older than threshold", () => {
    let store = createMemoryStore()
    const old = makeEvent("old detail", "conversation_behavior", 0.1)
    // Simulate an old event by backdating
    const oldEvent = { ...old, createdAt: new Date(Date.now() - 120 * 60 * 1000) }
    store = storeEvent(store, oldEvent)
    store = storeEvent(store, makeEvent("recent detail", "conversation_behavior", 0.3))
    const result = compressEvents(store, 60)
    expect(result.events).toHaveLength(1)
    expect(result.events[0].event).toBe("recent detail")
  })

  it("retains important events regardless of age", () => {
    let store = createMemoryStore()
    const old = makeEvent("old important", "key_event", 0.8)
    const oldEvent = { ...old, createdAt: new Date(Date.now() - 120 * 60 * 1000) }
    store = storeEvent(store, oldEvent)
    const result = compressEvents(store, 60)
    expect(result.events).toHaveLength(1)
  })
})

describe("extractEventFromTurn", () => {
  it("extracts user preference from message", () => {
    const event = extractEventFromTurn("I love programming in Python")
    expect(event).not.toBeNull()
    expect(event!.category).toBe("user_preference")
    expect(event!.importance).toBeGreaterThan(0)
  })

  it("returns null for trivial messages", () => {
    const event = extractEventFromTurn("yes")
    expect(event).toBeNull()
  })
})

describe("getMemorySummary", () => {
  it("returns empty summary for empty store", () => {
    const store = createMemoryStore()
    expect(getMemorySummary(store)).toBe("")
  })

  it("returns categorized summary for populated store", () => {
    let store = createMemoryStore()
    store = storeEvent(store, makeEvent("likes python", "user_preference", 0.3))
    store = storeEvent(store, makeEvent("got promoted", "key_event", 0.9))
    store = storeEvent(store, makeEvent("struggled with tenses", "conversation_behavior", 0.5))
    const summary = getMemorySummary(store)
    expect(summary).toContain("Preferences:")
    expect(summary).toContain("Key Events:")
    expect(summary).toContain("Conversation:")
  })
})

describe("recallEvent", () => {
  it("marks an event as recalled with timestamp", () => {
    let store = createMemoryStore()
    const event = makeEvent("test event", "conversation_behavior", 0.5)
    store = storeEvent(store, event)
    const recalled = recallEvent(store, event.id)
    expect(recalled).not.toBeNull()
    expect(recalled!.recallCount).toBe(1)
    expect(recalled!.lastRecalledAt).toBeInstanceOf(Date)
  })

  it("increments recallCount on subsequent recalls", () => {
    let store = createMemoryStore()
    const event = makeEvent("test event", "conversation_behavior", 0.5)
    store = storeEvent(store, event)
    store = storeEvent(store, recallEvent(store, event.id)!)
    store = storeEvent(store, recallEvent(store, event.id)!)
    const result = recallEvent(store, event.id)
    expect(result!.recallCount).toBe(3)
  })

  it("returns null for non-existent event id", () => {
    const store = createMemoryStore()
    expect(recallEvent(store, "nonexistent")).toBeNull()
  })
})

describe("getMostRecalled", () => {
  it("returns events sorted by recall count descending", () => {
    let store = createMemoryStore()
    const e1 = makeEvent("rarely recalled", "conversation_behavior", 0.3)
    const e2 = makeEvent("often recalled", "conversation_behavior", 0.5)
    const e3 = makeEvent("never recalled", "conversation_behavior", 0.4)
    store = storeEvent(store, e1)
    store = storeEvent(store, e2)
    store = storeEvent(store, e3)
    store = storeEvent(store, recallEvent(store, e1.id)!)
    store = storeEvent(store, recallEvent(store, e2.id)!)
    store = storeEvent(store, recallEvent(store, e2.id)!)
    const result = getMostRecalled(store, 2)
    expect(result).toHaveLength(2)
    expect(result[0].event).toBe("often recalled")
    expect(result[1].event).toBe("rarely recalled")
  })

  it("returns all events when limit not specified", () => {
    let store = createMemoryStore()
    store = storeEvent(store, makeEvent("a", "conversation_behavior", 0.3))
    store = storeEvent(store, makeEvent("b", "conversation_behavior", 0.3))
    store = storeEvent(store, makeEvent("c", "conversation_behavior", 0.3))
    expect(getMostRecalled(store)).toHaveLength(3)
  })
})

describe("findByImportanceRange", () => {
  it("returns events within importance range", () => {
    let store = createMemoryStore()
    store = storeEvent(store, makeEvent("low", "conversation_behavior", 0.2))
    store = storeEvent(store, makeEvent("medium", "conversation_behavior", 0.5))
    store = storeEvent(store, makeEvent("high", "key_event", 0.9))
    const result = findByImportanceRange(store, 0.3, 0.7)
    expect(result).toHaveLength(1)
    expect(result[0].event).toBe("medium")
  })

  it("returns empty array for non-overlapping range", () => {
    let store = createMemoryStore()
    store = storeEvent(store, makeEvent("low", "conversation_behavior", 0.1))
    expect(findByImportanceRange(store, 0.5, 1)).toHaveLength(0)
  })

  it("includes boundary values", () => {
    let store = createMemoryStore()
    store = storeEvent(store, makeEvent("exact", "conversation_behavior", 0.5))
    const result = findByImportanceRange(store, 0.5, 0.5)
    expect(result).toHaveLength(1)
  })
})

describe("memory recall consistency", () => {
  it("returns deterministic results for same retrieveByCategory query", () => {
    let store = createMemoryStore()
    store = storeEvent(store, makeEvent("likes python", "user_preference", 0.4))
    store = storeEvent(store, makeEvent("got promoted", "key_event", 0.9))
    const r1 = retrieveByCategory(store, "user_preference")
    const r2 = retrieveByCategory(store, "user_preference")
    expect(r1).toEqual(r2)
  })

  it("returns deterministic results for same searchMemory query", () => {
    let store = createMemoryStore()
    store = storeEvent(store, makeEvent("user likes python programming", "user_preference", 0.4))
    const r1 = searchMemory(store, "python")
    const r2 = searchMemory(store, "python")
    expect(r1).toEqual(r2)
  })

  it("retrieveByCategory and retrieveByImportance are consistent", () => {
    let store = createMemoryStore()
    store = storeEvent(store, makeEvent("likes python", "user_preference", 0.6))
    store = storeEvent(store, makeEvent("likes java", "user_preference", 0.3))
    const byCategory = retrieveByCategory(store, "user_preference")
    const byImportance = retrieveByImportance(store, 0).filter(
      (e) => e.category === "user_preference",
    )
    expect(byCategory).toHaveLength(byImportance.length)
  })

  it("recall tracking preserves queryability by category", () => {
    let store = createMemoryStore()
    const event = makeEvent("important memory", "key_event", 0.8)
    store = storeEvent(store, event)
    store = storeEvent(store, recallEvent(store, event.id)!)
    const retrieved = retrieveByCategory(store, "key_event")
    expect(retrieved).toHaveLength(2)
    expect(retrieved[retrieved.length - 1].recallCount).toBe(1)
  })

  it("extractEventFromTurn produces consistent categorization", () => {
    const r1 = extractEventFromTurn("I love Python programming")
    const r2 = extractEventFromTurn("I love Python programming")
    expect(r1).not.toBeNull()
    expect(r2).not.toBeNull()
    expect(r1!.category).toBe(r2!.category)
    expect(r1!.importance).toBe(r2!.importance)
  })

  it("storeEvent preserves event insertion order", () => {
    let store = createMemoryStore()
    const e1 = makeEvent("first", "conversation_behavior", 0.3)
    const e2 = makeEvent("second", "conversation_behavior", 0.5)
    const e3 = makeEvent("third", "key_event", 0.8)
    store = storeEvent(store, e1)
    store = storeEvent(store, e2)
    store = storeEvent(store, e3)
    const all = store.events
    expect(all[0].event).toBe("first")
    expect(all[1].event).toBe("second")
    expect(all[2].event).toBe("third")
    const recent = retrieveRecent(store, 2)
    expect(recent).toHaveLength(2)
  })

  it("compressEvents is idempotent", () => {
    let store = createMemoryStore()
    store = storeEvent(store, makeEvent("recent", "conversation_behavior", 0.3))
    const c1 = compressEvents(store)
    const c2 = compressEvents(c1)
    expect(c2.events).toEqual(c1.events)
  })
})
