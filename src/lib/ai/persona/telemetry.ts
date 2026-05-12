import type { RuntimeState, RelationshipState, ConversationState, MemoryCategory } from "./types"

export interface TelemetryStateSnapshot {
  runtime: {
    emotional: { valence: number; arousal: number; dominance: number }
    energy: number
    engagement: number
    socialOpenness: number
  }
  relationship: {
    familiarity: number
    trust: number
    comfort: number
    humorAcceptance: number
  }
  conversation: {
    turnCount: number
    consecutiveShortReplies: number
    userTopicChanges: number
  }
  memoryEventCount: number
}

export interface PipelineLatencyRecord {
  sessionId: string
  turnNumber: number
  durationMs: number
  timestamp: number
}

export interface MutationRuleFireRecord {
  sessionId: string
  ruleId: string
  turnNumber: number
  timestamp: number
}

export interface MemoryVolumeRecord {
  sessionId: string
  timestamp: number
  category: MemoryCategory
  categoryCount: number
  totalEvents: number
}

export interface StateChangeRecord {
  sessionId: string
  turnNumber: number
  timestamp: number
  before: TelemetryStateSnapshot
  after: TelemetryStateSnapshot
}

export interface TelemetrySummary {
  totalPipelines: number
  avgLatencyMs: number
  maxLatencyMs: number
  mutationFiresByRule: Record<string, number>
  memoryEventsByCategory: Record<string, number>
  totalStateChanges: number
  sessionsTracked: number
}

interface TelemetryData {
  pipelineLatency: PipelineLatencyRecord[]
  mutationRuleFires: MutationRuleFireRecord[]
  memoryVolumes: MemoryVolumeRecord[]
  stateChanges: StateChangeRecord[]
}

function getTelemetryData(): TelemetryData {
  if (!globalThis.__ai_english_telemetry) {
    globalThis.__ai_english_telemetry = {
      pipelineLatency: [],
      mutationRuleFires: [],
      memoryVolumes: [],
      stateChanges: [],
    }
  }
  return globalThis.__ai_english_telemetry as unknown as TelemetryData
}

const MAX_RECORDS = 1000

function cappedPush<T>(arr: T[], item: T, max: number): void {
  arr.push(item)
  if (arr.length > max) arr.splice(0, arr.length - max)
}

export function snapshotState(
  runtime: RuntimeState,
  relationship: RelationshipState,
  conversation: ConversationState,
  memoryEventCount: number,
): TelemetryStateSnapshot {
  return {
    runtime: {
      emotional: { ...runtime.emotional },
      energy: runtime.energy,
      engagement: runtime.engagement,
      socialOpenness: runtime.socialOpenness,
    },
    relationship: {
      familiarity: relationship.familiarity,
      trust: relationship.trust,
      comfort: relationship.comfort,
      humorAcceptance: relationship.humorAcceptance,
    },
    conversation: {
      turnCount: conversation.turnCount,
      consecutiveShortReplies: conversation.consecutiveShortReplies,
      userTopicChanges: conversation.userTopicChanges,
    },
    memoryEventCount,
  }
}

export function recordPipelineLatency(sessionId: string, turnNumber: number, durationMs: number): void {
  const data = getTelemetryData()
  cappedPush(data.pipelineLatency, { sessionId, turnNumber, durationMs, timestamp: Date.now() }, MAX_RECORDS)
}

export function recordMutationRuleFired(sessionId: string, ruleId: string, turnNumber: number): void {
  const data = getTelemetryData()
  cappedPush(data.mutationRuleFires, { sessionId, ruleId, turnNumber, timestamp: Date.now() }, MAX_RECORDS)
}

export function recordMemoryVolume(sessionId: string, category: MemoryCategory, categoryCount: number, totalEvents: number): void {
  const data = getTelemetryData()
  cappedPush(data.memoryVolumes, { sessionId, timestamp: Date.now(), category, categoryCount, totalEvents }, MAX_RECORDS)
}

export function recordStateChange(sessionId: string, turnNumber: number, before: TelemetryStateSnapshot, after: TelemetryStateSnapshot): void {
  const data = getTelemetryData()
  cappedPush(data.stateChanges, { sessionId, turnNumber, timestamp: Date.now(), before, after }, MAX_RECORDS)
}

export function getPipelineLatency(sessionId?: string): PipelineLatencyRecord[] {
  const data = getTelemetryData()
  if (sessionId) return data.pipelineLatency.filter(r => r.sessionId === sessionId)
  return [...data.pipelineLatency]
}

export function getMutationRuleFires(sessionId?: string): MutationRuleFireRecord[] {
  const data = getTelemetryData()
  if (sessionId) return data.mutationRuleFires.filter(r => r.sessionId === sessionId)
  return [...data.mutationRuleFires]
}

export function getMemoryVolumes(sessionId?: string): MemoryVolumeRecord[] {
  const data = getTelemetryData()
  if (sessionId) return data.memoryVolumes.filter(r => r.sessionId === sessionId)
  return [...data.memoryVolumes]
}

export function getStateChanges(sessionId?: string): StateChangeRecord[] {
  const data = getTelemetryData()
  if (sessionId) return data.stateChanges.filter(r => r.sessionId === sessionId)
  return [...data.stateChanges]
}

export function getTelemetrySummary(): TelemetrySummary {
  const data = getTelemetryData()

  const latencies = data.pipelineLatency
  const avg = latencies.length > 0
    ? latencies.reduce((s, r) => s + r.durationMs, 0) / latencies.length
    : 0
  const max = latencies.length > 0
    ? Math.max(...latencies.map(r => r.durationMs))
    : 0

  const mutationFiresByRule: Record<string, number> = {}
  for (const r of data.mutationRuleFires) {
    mutationFiresByRule[r.ruleId] = (mutationFiresByRule[r.ruleId] ?? 0) + 1
  }

  const memoryEventsByCategory: Record<string, number> = {}
  for (const r of data.memoryVolumes) {
    memoryEventsByCategory[r.category] = (memoryEventsByCategory[r.category] ?? 0) + r.categoryCount
  }

  const sessions = new Set(data.pipelineLatency.map(r => r.sessionId))
  data.mutationRuleFires.forEach(r => sessions.add(r.sessionId))
  data.stateChanges.forEach(r => sessions.add(r.sessionId))

  return {
    totalPipelines: data.pipelineLatency.length,
    avgLatencyMs: Math.round(avg * 100) / 100,
    maxLatencyMs: max,
    mutationFiresByRule,
    memoryEventsByCategory,
    totalStateChanges: data.stateChanges.length,
    sessionsTracked: sessions.size,
  }
}

export function resetTelemetry(): void {
  delete (globalThis as Record<string, unknown>).__ai_english_telemetry
}
