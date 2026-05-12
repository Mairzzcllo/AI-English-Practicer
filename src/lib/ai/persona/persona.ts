import type {
  PersonaConfig,
  RuntimeState,
  RelationshipState,
  ConversationState,
  BehavioralPolicy,
  MemoryPolicy,
  ConversationSignal,
  MemoryEvent,
  MemoryCategory,
} from "./types"
import type { MemoryStore } from "./memory"
import type { ModulationOutput } from "./policies"
import type { RuleEvaluator } from "./mutation"
import { createDefaultRuntimeState, createDefaultRelationshipState, createDefaultConversationState, createDefaultBehavioralPolicy } from "./types"
import { createMemoryStore, getMemorySummary } from "./memory"
import { createDefaultRules } from "./mutation"
import { needsIntervention } from "./state"
import { isEstablished } from "./relationship"
import { runCognitivePipeline } from "./orchestrator"
import { snapshotState, recordPipelineLatency, recordStateChange, recordMutationRuleFired, recordMemoryVolume } from "./telemetry"

export interface PersonaAgentOptions {
  initialPolicy?: Partial<BehavioralPolicy>
  initialRuntime?: Partial<RuntimeState>
  initialRelationship?: Partial<RelationshipState>
  initialConversation?: Partial<ConversationState>
  initialMemory?: MemoryStore
  evaluators?: RuleEvaluator[]
  memoryPolicy?: MemoryPolicy
}

export interface ProcessTurnInput {
  signal: ConversationSignal
  userMessage?: string
  timeDeltaMinutes?: number
  sessionId?: string
}

export interface ProcessTurnResult {
  modulation: ModulationOutput
  appliedRules: string[]
  needsIntervention: boolean
  isEstablished: boolean
  memoryEvent: MemoryEvent | null
}

export interface PersonaAgentState {
  config: PersonaConfig
  runtime: RuntimeState
  relationship: RelationshipState
  conversation: ConversationState
  memory: MemoryStore
  policy: BehavioralPolicy
  evaluators: RuleEvaluator[]
}

export class PersonaAgent {
  private config: PersonaConfig
  private runtime!: RuntimeState
  private relationship!: RelationshipState
  private conversation!: ConversationState
  private memory!: MemoryStore
  private policy: BehavioralPolicy
  private evaluators: RuleEvaluator[]

  constructor(config: PersonaConfig, options?: PersonaAgentOptions) {
    this.config = config
    this.policy = createDefaultBehavioralPolicy(options?.initialPolicy)
    this.evaluators = options?.evaluators ?? createDefaultRules()
    this.reset(options)
  }

  processTurn(input: ProcessTurnInput): ProcessTurnResult {
    const sid = input.sessionId
    const before = sid ? snapshotState(this.runtime, this.relationship, this.conversation, this.memory.events.length) : null
    const t0 = sid ? performance.now() : 0

    const result = runCognitivePipeline({
      signal: input.signal,
      runtime: this.runtime,
      relationship: this.relationship,
      conversation: this.conversation,
      memory: this.memory,
      policy: this.policy,
      config: this.config,
      evaluators: this.evaluators,
      userMessage: input.userMessage,
      timeDeltaMinutes: input.timeDeltaMinutes,
    })

    this.runtime = result.runtime
    this.relationship = result.relationship
    this.conversation = result.conversation
    this.memory = result.memory

    if (sid) {
      const durationMs = performance.now() - t0
      const turnNumber = this.conversation.turnCount
      recordPipelineLatency(sid, turnNumber, Math.round(durationMs * 100) / 100)

      const after = snapshotState(this.runtime, this.relationship, this.conversation, this.memory.events.length)
      recordStateChange(sid, turnNumber, before!, after)

      for (const ruleId of result.appliedRules) {
        recordMutationRuleFired(sid, ruleId, turnNumber)
      }

      const categories = new Map<MemoryCategory, number>()
      for (const ev of this.memory.events) {
        const cat = ev.category as MemoryCategory
        categories.set(cat, (categories.get(cat) ?? 0) + 1)
      }
      for (const [cat, count] of categories) {
        recordMemoryVolume(sid, cat, count, this.memory.events.length)
      }
    }

    return {
      modulation: result.modulation,
      appliedRules: result.appliedRules,
      needsIntervention: result.needsIntervention,
      isEstablished: result.isEstablished,
      memoryEvent: result.memoryEvent,
    }
  }

  getState(): PersonaAgentState {
    return {
      config: { ...this.config },
      runtime: { ...this.runtime, emotional: { ...this.runtime.emotional } },
      relationship: { ...this.relationship },
      conversation: { ...this.conversation },
      memory: { events: [...this.memory.events] },
      policy: { ...this.policy },
      evaluators: [...this.evaluators],
    }
  }

  needsIntervention(): boolean {
    return needsIntervention(this.runtime)
  }

  isEstablished(): boolean {
    return isEstablished(this.relationship)
  }

  getMemorySummary(): string {
    return getMemorySummary(this.memory)
  }

  reset(options?: PersonaAgentOptions): void {
    this.runtime = createDefaultRuntimeState(options?.initialRuntime)
    this.relationship = createDefaultRelationshipState(options?.initialRelationship)
    this.conversation = createDefaultConversationState(options?.initialConversation)
    this.memory = options?.initialMemory ?? createMemoryStore()
  }

  loadState(state: { runtime: RuntimeState; relationship: RelationshipState; conversation: ConversationState; memory: MemoryStore; policy: BehavioralPolicy }): void {
    this.runtime = state.runtime
    this.relationship = state.relationship
    this.conversation = state.conversation
    this.memory = state.memory
    this.policy = state.policy
  }
}
