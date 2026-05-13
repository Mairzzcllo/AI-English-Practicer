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
import type { IntentResult, ResponseBudget, MomentumState } from "../conversation/types"
import type { PersonaPromptInput } from "./prompts"
import { createDefaultRuntimeState, createDefaultRelationshipState, createDefaultConversationState, createDefaultBehavioralPolicy } from "./types"
import { createMemoryStore, getMemorySummary } from "./memory"
import { createDefaultRules } from "./mutation"
import { needsIntervention, deriveSignalFromIntent } from "./state"
import { isEstablished } from "./relationship"
import { runCognitivePipeline } from "./orchestrator"
import { runPipeline } from "../conversation/pipeline"
import { createDefaultMomentumState } from "../conversation/momentum"
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
  signal?: ConversationSignal
  userMessage?: string
  timeDeltaMinutes?: number
  sessionId?: string
  intentOverride?: IntentResult
}

export interface ProcessTurnResult {
  modulation: ModulationOutput
  appliedRules: string[]
  needsIntervention: boolean
  isEstablished: boolean
  memoryEvent: MemoryEvent | null
  intent?: IntentResult
  budget?: ResponseBudget
  momentum?: MomentumState
}

export interface PersonaAgentState {
  config: PersonaConfig
  runtime: RuntimeState
  relationship: RelationshipState
  conversation: ConversationState
  memory: MemoryStore
  policy: BehavioralPolicy
  evaluators: RuleEvaluator[]
  momentum: MomentumState
}

function buildModulationInput(runtime: RuntimeState, relationship: RelationshipState, policy: BehavioralPolicy) {
  return {
    engagement: runtime.engagement,
    verbosity: policy.verbosity,
    familiarity: relationship.familiarity,
  }
}

export class PersonaAgent {
  private config: PersonaConfig
  private runtime!: RuntimeState
  private relationship!: RelationshipState
  private conversation!: ConversationState
  private memory!: MemoryStore
  private policy: BehavioralPolicy
  private evaluators: RuleEvaluator[]
  private momentum: MomentumState

  constructor(config: PersonaConfig, options?: PersonaAgentOptions) {
    this.config = config
    this.policy = createDefaultBehavioralPolicy(options?.initialPolicy)
    this.evaluators = options?.evaluators ?? createDefaultRules()
    this.momentum = createDefaultMomentumState()
    this.reset(options)
  }

  processTurn(input: ProcessTurnInput): ProcessTurnResult {
    const sid = input.sessionId
    const before = sid ? snapshotState(this.runtime, this.relationship, this.conversation, this.memory.events.length) : null
    const t0 = sid ? performance.now() : 0

    let pipelineIntent: IntentResult | undefined
    let pipelineBudget: ResponseBudget | undefined
    let pipelineMomentum: MomentumState | undefined

    if (input.userMessage) {
      const personaInput: PersonaPromptInput = {
        config: this.config,
        runtime: this.runtime,
        relationship: this.relationship,
        conversation: this.conversation,
        memory: this.memory,
      }
      const modulation = buildModulationInput(this.runtime, this.relationship, this.policy)

      const pipelineResult = runPipeline({
        userMessage: input.userMessage,
        personaInput,
        modulation,
        momentum: this.momentum,
        intentOverride: input.intentOverride,
      })

      pipelineIntent = pipelineResult.intent
      pipelineBudget = pipelineResult.budget
      pipelineMomentum = pipelineResult.momentum
      this.momentum = pipelineResult.momentum
    }

    const effectiveSignal = input.userMessage
      ? (input.signal ?? deriveSignalFromIntent(
          pipelineIntent ?? { intent: "continue_conversation", confidence: 0.5 },
          input.userMessage,
        ))
      : input.signal!

    const result = runCognitivePipeline({
      signal: effectiveSignal,
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
      intent: pipelineIntent,
      budget: pipelineBudget,
      momentum: pipelineMomentum,
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
      momentum: { ...this.momentum },
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
    this.momentum = createDefaultMomentumState()
  }

  loadState(state: { runtime: RuntimeState; relationship: RelationshipState; conversation: ConversationState; memory: MemoryStore; policy: BehavioralPolicy }): void {
    this.runtime = state.runtime
    this.relationship = state.relationship
    this.conversation = state.conversation
    this.memory = state.memory
    this.policy = state.policy
  }
}
