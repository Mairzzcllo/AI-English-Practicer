export type MemoryLevel = "ephemeral" | "short_term" | "long_term" | "core"

export type MemoryCategory =
  | "user_fact"
  | "user_preference"
  | "relationship_history"
  | "emotional_pattern"
  | "behavioral_pattern"
  | "key_event"
  | "conversation_behavior"

export type SignalType =
  | "short_reply"
  | "long_reply"
  | "question"
  | "correction_needed"
  | "positive_sentiment"
  | "negative_sentiment"
  | "silence"
  | "interruption"
  | "disengagement"
  | "curiosity"
  | "hesitation"
  | "frustration"
  | "openness"

export type CorrectionStyle = "gentle" | "direct" | "none"

export type AttachmentStyle = "secure" | "anxious" | "avoidant" | "disorganized"

export type HumorStyle = "dry" | "playful" | "warm" | "none"

export type ConflictStyle = "avoidant" | "direct" | "diplomatic" | "collaborative"

export type TeachingStyle = "socratic" | "explicit" | "scaffolding" | "observational"

export type SocialBoundary = "formal" | "casual" | "intimate"

export type ResponsePacing = "slow" | "moderate" | "fast"

export type Tone = "warm" | "neutral" | "formal" | "playful" | "supportive"

export interface EmotionalState {
  valence: number
  arousal: number
  dominance: number
}

export interface PersonaConfig {
  name: string
  traits: string[]
  speakingStyle: string
  baseTone: string
  background?: string
  coreValues: string[]
  attachmentStyle: AttachmentStyle
  initiativeBias: number
  humorStyle: HumorStyle
  conflictStyle: ConflictStyle
  teachingStyle: TeachingStyle
  socialBoundaries: SocialBoundary
}

export interface RuntimeState {
  emotional: EmotionalState
  energy: number
  engagement: number
  socialOpenness: number
}

export interface RelationshipState {
  familiarity: number
  trust: number
  comfort: number
  humorAcceptance: number
}

export interface BehavioralPolicy {
  correctionStyle: CorrectionStyle
  initiativeLevel: number
  humorLevel: number
  verbosity: number
  responsePacing: ResponsePacing
  interruptTolerance: number
  emotionalMirroring: number
  topicPersistence: number
  tone: Tone
}

export interface MemoryEvent {
  id: string
  event: string
  importance: number
  category: MemoryCategory
  level: MemoryLevel
  createdAt: Date
  emotionalWeight: number
  relationshipImpact: number
  decayRate: number
  lastRecalledAt: Date | null
  recallCount: number
}

export interface ConversationState {
  turnCount: number
  lastUserMessageLength: number
  consecutiveShortReplies: number
  userTopicChanges: number
  sessionDurationMinutes: number
}

export interface ConversationSignal {
  type: SignalType
  intensity: number
}

export interface MemoryPolicy {
  coreThreshold: number
  longTermThreshold: number
  shortTermThreshold: number
  coreRequiresKeyEvent: boolean
  baseDecayRate: number
  emotionalWeightFactor: number
  relationshipImpactFactor: number
}

export interface StateMutationRule {
  id: string
  condition: string
  target: string
  delta: number
  description: string
}

export function normalizeStateValue(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

export function createDefaultPersonaConfig(overrides?: Partial<PersonaConfig>): PersonaConfig {
  return {
    name: "default",
    traits: [],
    speakingStyle: "conversational",
    baseTone: "friendly",
    coreValues: [],
    attachmentStyle: "secure",
    initiativeBias: normalizeStateValue(overrides?.initiativeBias ?? 0.5, 0, 1),
    humorStyle: "warm",
    conflictStyle: "diplomatic",
    teachingStyle: "socratic",
    socialBoundaries: "casual",
    ...overrides,
  }
}

export function createDefaultEmotionalState(overrides?: Partial<EmotionalState>): EmotionalState {
  return {
    valence: normalizeStateValue(overrides?.valence ?? 0, -1, 1),
    arousal: normalizeStateValue(overrides?.arousal ?? 0.5, 0, 1),
    dominance: normalizeStateValue(overrides?.dominance ?? 0.5, 0, 1),
  }
}

export function createDefaultRuntimeState(overrides?: Partial<RuntimeState>): RuntimeState {
  return {
    emotional: createDefaultEmotionalState(overrides?.emotional),
    energy: normalizeStateValue(overrides?.energy ?? 0.7, 0, 1),
    engagement: normalizeStateValue(overrides?.engagement ?? 0.5, 0, 1),
    socialOpenness: normalizeStateValue(overrides?.socialOpenness ?? 0.5, 0, 1),
  }
}

export function createDefaultRelationshipState(overrides?: Partial<RelationshipState>): RelationshipState {
  return {
    familiarity: normalizeStateValue(overrides?.familiarity ?? 0, 0, 1),
    trust: normalizeStateValue(overrides?.trust ?? 0, 0, 1),
    comfort: normalizeStateValue(overrides?.comfort ?? 0, 0, 1),
    humorAcceptance: normalizeStateValue(overrides?.humorAcceptance ?? 0, 0, 1),
  }
}

export function createDefaultBehavioralPolicy(overrides?: Partial<BehavioralPolicy>): BehavioralPolicy {
  return {
    correctionStyle: "gentle",
    initiativeLevel: normalizeStateValue(overrides?.initiativeLevel ?? 0.5, 0, 1),
    humorLevel: normalizeStateValue(overrides?.humorLevel ?? 0.3, 0, 1),
    verbosity: normalizeStateValue(overrides?.verbosity ?? 0.5, 0, 1),
    responsePacing: "moderate",
    interruptTolerance: normalizeStateValue(overrides?.interruptTolerance ?? 0.5, 0, 1),
    emotionalMirroring: normalizeStateValue(overrides?.emotionalMirroring ?? 0.5, 0, 1),
    topicPersistence: normalizeStateValue(overrides?.topicPersistence ?? 0.5, 0, 1),
    tone: overrides?.tone ?? "warm",
  }
}

export function createDefaultConversationState(overrides?: Partial<ConversationState>): ConversationState {
  return {
    turnCount: 0,
    lastUserMessageLength: 0,
    consecutiveShortReplies: 0,
    userTopicChanges: 0,
    sessionDurationMinutes: 0,
    ...overrides,
  }
}

export function createDefaultMemoryPolicy(overrides?: Partial<MemoryPolicy>): MemoryPolicy {
  return {
    coreThreshold: 0.9,
    longTermThreshold: 0.7,
    shortTermThreshold: 0.4,
    coreRequiresKeyEvent: true,
    baseDecayRate: 0.1,
    emotionalWeightFactor: 0.3,
    relationshipImpactFactor: 0.2,
    ...overrides,
  }
}

function generateId(): string {
  return crypto.randomUUID()
}

function determineMemoryLevel(
  importance: number,
  category: MemoryCategory,
  policy?: MemoryPolicy,
): MemoryLevel {
  const p = policy ?? createDefaultMemoryPolicy()
  if ((!p.coreRequiresKeyEvent || category === "key_event") && importance >= p.coreThreshold) return "core"
  if (importance >= p.longTermThreshold) return "long_term"
  if (importance >= p.shortTermThreshold) return "short_term"
  return "ephemeral"
}

export function createMemoryEvent(
  event: string,
  category: MemoryCategory,
  importance: number,
  policy?: MemoryPolicy,
): MemoryEvent {
  const p = policy ?? createDefaultMemoryPolicy()
  const clamped = normalizeStateValue(importance, 0, 1)
  return {
    id: generateId(),
    event,
    category,
    importance: clamped,
    level: determineMemoryLevel(clamped, category, p),
    createdAt: new Date(),
    emotionalWeight: clamped * p.emotionalWeightFactor,
    relationshipImpact: clamped * p.relationshipImpactFactor,
    decayRate: p.baseDecayRate,
    lastRecalledAt: null,
    recallCount: 0,
  }
}
