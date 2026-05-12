import { describe, it, expect, beforeEach } from "vitest"
import type { PersonaConfig } from "./types"
import {
  createPersonaStore,
  resetPersonaStore,
  type PersonaSnapshot,
  type PersonaStore,
} from "./store"
import { createDefaultRuntimeState, createDefaultRelationshipState, createDefaultConversationState, createDefaultBehavioralPolicy } from "./types"
import { createMemoryStore } from "./memory"

function baseConfig(overrides?: Partial<PersonaConfig>): PersonaConfig {
  return {
    name: "Sofia",
    traits: ["patient", "encouraging"],
    speakingStyle: "warm",
    baseTone: "friendly",
    coreValues: ["patience"],
    attachmentStyle: "secure",
    initiativeBias: 0.5,
    humorStyle: "warm",
    conflictStyle: "diplomatic",
    teachingStyle: "socratic",
    socialBoundaries: "casual",
    ...overrides,
  }
}

describe("PersonaStore", () => {
  let store: PersonaStore

  beforeEach(async () => {
    resetPersonaStore()
    store = await createPersonaStore()
  })

  describe("createSession / getSession", () => {
    it("creates a session and returns its id", async () => {
      const id = await store.createSession(baseConfig())
      expect(id).toBeTruthy()
      expect(typeof id).toBe("string")
    })

    it("retrieves session config by id", async () => {
      const id = await store.createSession(baseConfig({ name: "TestBot" }))
      const session = await store.getSession(id)
      expect(session).not.toBeNull()
      expect(session!.config.name).toBe("TestBot")
    })

    it("returns null for non-existent session", async () => {
      const session = await store.getSession("nonexistent")
      expect(session).toBeNull()
    })

    it("returns null for empty id", async () => {
      const session = await store.getSession("")
      expect(session).toBeNull()
    })
  })

  describe("appendEvent / getEvents", () => {
    it("appends an event and returns event id", async () => {
      const sessionId = await store.createSession(baseConfig())
      const eventId = await store.appendEvent(sessionId, {
        type: "conversation_turn",
        data: { turnCount: 1 },
      })
      expect(eventId).toBeTruthy()
      expect(typeof eventId).toBe("string")
    })

    it("retrieves events in order", async () => {
      const sessionId = await store.createSession(baseConfig())
      await store.appendEvent(sessionId, { type: "conversation_turn", data: { turn: 1 } })
      await store.appendEvent(sessionId, { type: "state_mutation", data: { field: "engagement", delta: 0.1 } })
      await store.appendEvent(sessionId, { type: "memory_event", data: { event: "User loves cooking" } })
      const events = await store.getEvents(sessionId)
      expect(events).toHaveLength(3)
      expect(events[0].type).toBe("conversation_turn")
      expect(events[1].type).toBe("state_mutation")
      expect(events[2].type).toBe("memory_event")
    })

    it("assigns sequential sequence numbers", async () => {
      const sessionId = await store.createSession(baseConfig())
      await store.appendEvent(sessionId, { type: "conversation_turn", data: { turn: 1 } })
      await store.appendEvent(sessionId, { type: "conversation_turn", data: { turn: 2 } })
      const events = await store.getEvents(sessionId)
      expect(events[0].sequence).toBe(1)
      expect(events[1].sequence).toBe(2)
    })

    it("includes timestamp on events", async () => {
      const sessionId = await store.createSession(baseConfig())
      await store.appendEvent(sessionId, { type: "conversation_turn", data: {} })
      const events = await store.getEvents(sessionId)
      expect(events[0].timestamp).toBeInstanceOf(Date)
    })
  })

  describe("getEventsSince", () => {
    it("returns events after a given sequence number", async () => {
      const sessionId = await store.createSession(baseConfig())
      await store.appendEvent(sessionId, { type: "conversation_turn", data: { turn: 1 } })
      await store.appendEvent(sessionId, { type: "conversation_turn", data: { turn: 2 } })
      await store.appendEvent(sessionId, { type: "conversation_turn", data: { turn: 3 } })
      const events = await store.getEventsSince(sessionId, 1)
      expect(events).toHaveLength(2)
      expect(events[0].data.turn).toBe(2)
      expect(events[1].data.turn).toBe(3)
    })

    it("returns empty array when no events since sequence", async () => {
      const sessionId = await store.createSession(baseConfig())
      await store.appendEvent(sessionId, { type: "conversation_turn", data: { turn: 1 } })
      const events = await store.getEventsSince(sessionId, 5)
      expect(events).toHaveLength(0)
    })
  })

  describe("snapshots", () => {
    it("saves and retrieves latest snapshot", async () => {
      const sessionId = await store.createSession(baseConfig())
      const snapshot: PersonaSnapshot = {
        sessionId,
        runtime: createDefaultRuntimeState({ energy: 0.5 }),
        relationship: createDefaultRelationshipState({ familiarity: 0.4 }),
        conversation: createDefaultConversationState({ turnCount: 5 }),
        memory: createMemoryStore(),
        policy: createDefaultBehavioralPolicy({ verbosity: 0.7 }),
        sequence: 3,
      }
      await store.saveSnapshot(sessionId, snapshot)
      const retrieved = await store.getLatestSnapshot(sessionId)
      expect(retrieved).not.toBeNull()
      expect(retrieved!.runtime.energy).toBe(0.5)
      expect(retrieved!.relationship.familiarity).toBe(0.4)
      expect(retrieved!.conversation.turnCount).toBe(5)
      expect(retrieved!.policy.verbosity).toBe(0.7)
    })

    it("returns latest snapshot when multiple exist", async () => {
      const sessionId = await store.createSession(baseConfig())
      await store.saveSnapshot(sessionId, {
        sessionId, sequence: 1,
        runtime: createDefaultRuntimeState({ energy: 0.7 }),
        relationship: createDefaultRelationshipState(),
        conversation: createDefaultConversationState(),
        memory: createMemoryStore(),
        policy: createDefaultBehavioralPolicy(),
      })
      await store.saveSnapshot(sessionId, {
        sessionId, sequence: 5,
        runtime: createDefaultRuntimeState({ energy: 0.3 }),
        relationship: createDefaultRelationshipState(),
        conversation: createDefaultConversationState({ turnCount: 10 }),
        memory: createMemoryStore(),
        policy: createDefaultBehavioralPolicy(),
      })
      const retrieved = await store.getLatestSnapshot(sessionId)
      expect(retrieved!.sequence).toBe(5)
      expect(retrieved!.runtime.energy).toBe(0.3)
      expect(retrieved!.conversation.turnCount).toBe(10)
    })

    it("returns null when no snapshot exists", async () => {
      const sessionId = await store.createSession(baseConfig())
      const snapshot = await store.getLatestSnapshot(sessionId)
      expect(snapshot).toBeNull()
    })
  })

  describe("deleteSession", () => {
    it("deletes session and its events", async () => {
      const sessionId = await store.createSession(baseConfig())
      await store.appendEvent(sessionId, { type: "conversation_turn", data: { turn: 1 } })
      await store.deleteSession(sessionId)
      const session = await store.getSession(sessionId)
      expect(session).toBeNull()
      const events = await store.getEvents(sessionId)
      expect(events).toHaveLength(0)
    })

    it("does not affect other sessions", async () => {
      const id1 = await store.createSession(baseConfig({ name: "A" }))
      const id2 = await store.createSession(baseConfig({ name: "B" }))
      await store.appendEvent(id1, { type: "conversation_turn", data: { turn: 1 } })
      await store.appendEvent(id2, { type: "conversation_turn", data: { turn: 1 } })
      await store.deleteSession(id1)
      const session2 = await store.getSession(id2)
      expect(session2).not.toBeNull()
      const events2 = await store.getEvents(id2)
      expect(events2).toHaveLength(1)
    })
  })
})
