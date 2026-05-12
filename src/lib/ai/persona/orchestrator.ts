import type {
  RuntimeState,
  RelationshipState,
  ConversationState,
  BehavioralPolicy,
  PersonaConfig,
  MemoryPolicy,
  ConversationSignal,
  MemoryEvent,
} from "./types"
import type { MemoryStore } from "./memory"
import type { ModulationOutput } from "./policies"
import type { RuleEvaluator, MutationResult } from "./mutation"
import { processSignal, updateConversationFromSignal, applyDecay, applyConversationDecay, needsIntervention } from "./state"
import { processRelationshipSignal, applyRelationshipDecay, isEstablished } from "./relationship"
import { storeEvent, extractEventFromTurn } from "./memory"
import { applyMutations, createDefaultRules } from "./mutation"
import { modulateResponse } from "./policies"

export interface CognitivePipelineInput {
  signal: ConversationSignal
  runtime: RuntimeState
  relationship: RelationshipState
  conversation: ConversationState
  memory: MemoryStore
  policy: BehavioralPolicy
  config: PersonaConfig
  memoryPolicy?: MemoryPolicy
  evaluators?: RuleEvaluator[]
  userMessage?: string
  timeDeltaMinutes?: number
}

export interface CognitivePipelineResult {
  runtime: RuntimeState
  relationship: RelationshipState
  conversation: ConversationState
  memory: MemoryStore
  modulation: ModulationOutput
  appliedRules: string[]
  needsIntervention: boolean
  isEstablished: boolean
  memoryEvent: MemoryEvent | null
}

export function runCognitivePipeline(input: CognitivePipelineInput): CognitivePipelineResult {
  const {
    signal,
    policy,
    config: _config,
    memoryPolicy: _memoryPolicy,
    evaluators,
    userMessage,
    timeDeltaMinutes = 0.5,
  } = input

  void _config; void _memoryPolicy

  let runtime: RuntimeState = input.runtime
  let relationship: RelationshipState = input.relationship
  let conversation: ConversationState = input.conversation
  let memory: MemoryStore = input.memory

  const wordCount = userMessage ? userMessage.trim().split(/\s+/).filter(Boolean).length : undefined
  conversation = updateConversationFromSignal(conversation, signal, wordCount)
  runtime = processSignal(runtime, signal)
  relationship = processRelationshipSignal(relationship, signal)

  let memoryEvent: MemoryEvent | null = null
  if (userMessage) {
    memoryEvent = extractEventFromTurn(userMessage)
    if (memoryEvent) {
      memory = storeEvent(memory, memoryEvent)
    }
  }

  const rules = evaluators ?? createDefaultRules()
  const mutationResult: MutationResult = applyMutations(rules, signal, runtime, conversation, relationship)
  runtime = mutationResult.runtime
  relationship = mutationResult.relationship

  runtime = applyDecay(runtime, timeDeltaMinutes)
  relationship = applyRelationshipDecay(relationship, timeDeltaMinutes)
  conversation = applyConversationDecay(conversation, timeDeltaMinutes)

  const modulation = modulateResponse(policy, signal, runtime, conversation, relationship)

  return {
    runtime,
    relationship,
    conversation,
    memory,
    modulation,
    appliedRules: mutationResult.appliedRules,
    needsIntervention: needsIntervention(runtime),
    isEstablished: isEstablished(relationship),
    memoryEvent,
  }
}
