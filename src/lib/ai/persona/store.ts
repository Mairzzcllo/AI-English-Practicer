import type {
  PersonaConfig,
  RuntimeState,
  RelationshipState,
  ConversationState,
  BehavioralPolicy,
  MemoryEvent,
} from "./types"
import type { MemoryStore } from "./memory"
import { connectDB } from "@/lib/mongoose"
import { PersonaState } from "@/models/PersonaState"

export type PersonaEventType =
  | "conversation_turn"
  | "state_mutation"
  | "memory_event"
  | "relationship_change"
  | "session_start"
  | "session_end"

export interface PersonaEvent {
  id: string
  sessionId: string
  type: PersonaEventType
  timestamp: Date
  data: Record<string, unknown>
  sequence: number
}

export interface PersonaSnapshot {
  sessionId: string
  runtime: RuntimeState
  relationship: RelationshipState
  conversation: ConversationState
  memory: MemoryStore
  policy: BehavioralPolicy
  sequence: number
}

export interface PersonaSessionRecord {
  sessionId: string
  config: PersonaConfig
  createdAt: Date
  updatedAt: Date
}

export interface PersonaStore {
  createSession(config: PersonaConfig, sessionId?: string): Promise<string>
  getSession(sessionId: string): Promise<PersonaSessionRecord | null>
  appendEvent(sessionId: string, event: { type: PersonaEventType; data: Record<string, unknown> }): Promise<string>
  getEvents(sessionId: string): Promise<PersonaEvent[]>
  getEventsSince(sessionId: string, sequence: number): Promise<PersonaEvent[]>
  saveSnapshot(sessionId: string, snapshot: PersonaSnapshot): Promise<void>
  getLatestSnapshot(sessionId: string): Promise<PersonaSnapshot | null>
  deleteSession(sessionId: string): Promise<void>
}

function generateId(): string {
  return crypto.randomUUID()
}

const MAX_EVENTS = 200

interface InMemoryData {
  sessions: Map<string, PersonaSessionRecord>
  events: Map<string, PersonaEvent[]>
  snapshots: Map<string, PersonaSnapshot[]>
  sequences: Map<string, number>
}

function getMemData(): InMemoryData {
  if (!globalThis.__ai_english_persona_mem) {
    globalThis.__ai_english_persona_mem = {
      sessions: new Map(),
      events: new Map(),
      snapshots: new Map(),
      sequences: new Map(),
    }
  }
  return globalThis.__ai_english_persona_mem as unknown as InMemoryData
}

class InMemoryPersonaStore implements PersonaStore {
  async createSession(config: PersonaConfig, sessionId?: string): Promise<string> {
    const mem = getMemData()
    const id = sessionId ?? generateId()
    const now = new Date()
    mem.sessions.set(id, { sessionId: id, config, createdAt: now, updatedAt: now })
    mem.events.set(id, [])
    mem.snapshots.set(id, [])
    mem.sequences.set(id, 0)
    return id
  }

  async getSession(sessionId: string): Promise<PersonaSessionRecord | null> {
    if (!sessionId) return null
    return getMemData().sessions.get(sessionId) ?? null
  }

  async appendEvent(
    sessionId: string,
    event: { type: PersonaEventType; data: Record<string, unknown> },
  ): Promise<string> {
    const mem = getMemData()
    if (!mem.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} not found`)
    }
    const seq = (mem.sequences.get(sessionId) ?? 0) + 1
    mem.sequences.set(sessionId, seq)
    const evt: PersonaEvent = {
      id: generateId(),
      sessionId,
      type: event.type,
      timestamp: new Date(),
      data: event.data,
      sequence: seq,
    }
    const events = mem.events.get(sessionId)!
    events.push(evt)
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS)
    mem.sessions.get(sessionId)!.updatedAt = new Date()
    return evt.id
  }

  async getEvents(sessionId: string): Promise<PersonaEvent[]> {
    return getMemData().events.get(sessionId) ?? []
  }

  async getEventsSince(sessionId: string, sequence: number): Promise<PersonaEvent[]> {
    const all = getMemData().events.get(sessionId) ?? []
    return all.filter((e) => e.sequence > sequence)
  }

  async saveSnapshot(sessionId: string, snapshot: PersonaSnapshot): Promise<void> {
    const mem = getMemData()
    if (!mem.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} not found`)
    }
    mem.snapshots.get(sessionId)!.push(snapshot)
  }

  async getLatestSnapshot(sessionId: string): Promise<PersonaSnapshot | null> {
    const snaps = getMemData().snapshots.get(sessionId) ?? []
    if (snaps.length === 0) return null
    return snaps.reduce((latest, s) => (s.sequence > latest.sequence ? s : latest))
  }

  async deleteSession(sessionId: string): Promise<void> {
    const mem = getMemData()
    mem.sessions.delete(sessionId)
    mem.events.delete(sessionId)
    mem.snapshots.delete(sessionId)
    mem.sequences.delete(sessionId)
  }
}

class MongoPersonaStore implements PersonaStore {
  async createSession(config: PersonaConfig, sessionId?: string): Promise<string> {
    const id = sessionId ?? generateId()
    await PersonaState.create({
      sessionId: id,
      config: config as unknown as Record<string, unknown>,
      events: [],
    })
    return id
  }

  async getSession(sessionId: string): Promise<PersonaSessionRecord | null> {
    if (!sessionId) return null
    const doc = await PersonaState.findOne({ sessionId }).lean()
    if (!doc) return null
    return {
      sessionId: doc.sessionId,
      config: doc.config as unknown as PersonaConfig,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }
  }

  async appendEvent(
    sessionId: string,
    event: { type: PersonaEventType; data: Record<string, unknown> },
  ): Promise<string> {
    const evt = {
      id: generateId(),
      type: event.type,
      timestamp: new Date(),
      data: event.data,
      sequence: Date.now(),
    }
    const doc = await PersonaState.findOneAndUpdate(
      { sessionId },
      {
        $push: {
          events: {
            $each: [evt],
            $slice: -MAX_EVENTS,
          },
        },
      },
      { new: true }
    )
    if (!doc) throw new Error(`Session ${sessionId} not found`)
    return evt.id
  }

  async getEvents(sessionId: string): Promise<PersonaEvent[]> {
    const doc = await PersonaState.findOne({ sessionId }).lean()
    if (!doc) return []
    return doc.events.map((e: Record<string, unknown>) => ({
      id: e.id as string,
      sessionId,
      type: e.type as PersonaEventType,
      timestamp: e.timestamp as Date,
      data: e.data as Record<string, unknown>,
      sequence: e.sequence as number,
    }))
  }

  async getEventsSince(sessionId: string, sequence: number): Promise<PersonaEvent[]> {
    const all = await this.getEvents(sessionId)
    return all.filter((e) => e.sequence > sequence)
  }

  async saveSnapshot(sessionId: string, snapshot: PersonaSnapshot): Promise<void> {
    const { runtime, relationship, conversation, memory, policy } = snapshot
    await PersonaState.updateOne(
      { sessionId },
      {
        $set: {
          runtime: runtime as unknown as Record<string, unknown>,
          relationship: relationship as unknown as Record<string, unknown>,
          conversation: conversation as unknown as Record<string, unknown>,
          memory: { events: (memory?.events ?? []) as unknown as Record<string, unknown>[] },
          policy: policy as unknown as Record<string, unknown>,
        },
      }
    )
  }

  async getLatestSnapshot(sessionId: string): Promise<PersonaSnapshot | null> {
    const doc = await PersonaState.findOne({ sessionId }).lean()
    if (!doc) return null
    if (!doc.runtime) return null
    return {
      sessionId,
      runtime: doc.runtime as unknown as RuntimeState,
      relationship: doc.relationship as unknown as RelationshipState,
      conversation: doc.conversation as unknown as ConversationState,
      memory: { events: ((doc.memory as Record<string, unknown>[]) ?? []) as unknown as MemoryEvent[] },
      policy: doc.policy as unknown as BehavioralPolicy,
      sequence: 0,
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    await PersonaState.deleteOne({ sessionId })
  }
}

class CachingPersonaStore implements PersonaStore {
  private inner: PersonaStore
  private configCache = new Map<string, { record: PersonaSessionRecord; ts: number }>()
  private readonly CACHE_TTL_MS = 300_000

  constructor(inner: PersonaStore) {
    this.inner = inner
  }

  private isCacheValid(ts: number): boolean {
    return Date.now() - ts < this.CACHE_TTL_MS
  }

  async createSession(config: PersonaConfig, sessionId?: string): Promise<string> {
    const id = await this.inner.createSession(config, sessionId)
    this.configCache.set(id, { record: { sessionId: id, config, createdAt: new Date(), updatedAt: new Date() }, ts: Date.now() })
    return id
  }

  async getSession(sessionId: string): Promise<PersonaSessionRecord | null> {
    const cached = this.configCache.get(sessionId)
    if (cached && this.isCacheValid(cached.ts)) return cached.record
    const record = await this.inner.getSession(sessionId)
    if (record) this.configCache.set(sessionId, { record, ts: Date.now() })
    return record
  }

  async appendEvent(sessionId: string, event: { type: PersonaEventType; data: Record<string, unknown> }): Promise<string> {
    return this.inner.appendEvent(sessionId, event)
  }

  async getEvents(sessionId: string): Promise<PersonaEvent[]> {
    return this.inner.getEvents(sessionId)
  }

  async getEventsSince(sessionId: string, sequence: number): Promise<PersonaEvent[]> {
    return this.inner.getEventsSince(sessionId, sequence)
  }

  async saveSnapshot(sessionId: string, snapshot: PersonaSnapshot): Promise<void> {
    this.configCache.delete(sessionId)
    return this.inner.saveSnapshot(sessionId, snapshot)
  }

  async getLatestSnapshot(sessionId: string): Promise<PersonaSnapshot | null> {
    return this.inner.getLatestSnapshot(sessionId)
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.configCache.delete(sessionId)
    return this.inner.deleteSession(sessionId)
  }
}

let useMongo = true

async function checkMongo(): Promise<boolean> {
  if (!useMongo) return false
  try {
    await connectDB()
    return true
  } catch {
    useMongo = false
    return false
  }
}

let personaStoreInstance: PersonaStore | null = null

export async function createPersonaStore(): Promise<PersonaStore> {
  if (personaStoreInstance) return personaStoreInstance
  const hasMongo = await checkMongo()
  const inner = hasMongo ? new MongoPersonaStore() : new InMemoryPersonaStore()
  personaStoreInstance = new CachingPersonaStore(inner)
  return personaStoreInstance
}

export function resetPersonaStore(): void {
  personaStoreInstance = null
  delete (globalThis as Record<string, unknown>).__ai_english_persona_mem
}
