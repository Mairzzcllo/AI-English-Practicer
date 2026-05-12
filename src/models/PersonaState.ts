import mongoose, { Schema, Document } from "mongoose"

export interface IEmotionalState {
  valence: number
  arousal: number
  dominance: number
}

export interface IRuntimeState {
  emotional: IEmotionalState
  energy: number
  engagement: number
  socialOpenness: number
}

export interface IRelationshipState {
  familiarity: number
  trust: number
  comfort: number
  humorAcceptance: number
}

export interface IConversationState {
  turnCount: number
  lastUserMessageLength: number
  consecutiveShortReplies: number
  userTopicChanges: number
  sessionDurationMinutes: number
}

export interface IMemoryEvent {
  id: string
  event: string
  importance: number
  category: string
  level: string
  createdAt: Date
  emotionalWeight: number
  relationshipImpact: number
  decayRate: number
  lastRecalledAt: Date | null
  recallCount: number
}

export interface IMemoryStore {
  events: IMemoryEvent[]
}

export interface IPersonaEvent {
  id: string
  type: string
  timestamp: Date
  data: Record<string, unknown>
  sequence: number
}

export interface IPersonaState extends Document {
  sessionId: string
  config: Record<string, unknown>
  runtime: IRuntimeState
  relationship: IRelationshipState
  conversation: IConversationState
  memory: IMemoryStore
  policy: Record<string, unknown>
  events: IPersonaEvent[]
  createdAt: Date
  updatedAt: Date
}

const emotionalStateSchema = new Schema({
  valence: { type: Number, default: 0 },
  arousal: { type: Number, default: 0.5 },
  dominance: { type: Number, default: 0.5 },
}, { _id: false })

const runtimeStateSchema = new Schema({
  emotional: { type: emotionalStateSchema, default: () => ({}) },
  energy: { type: Number, default: 0.7 },
  engagement: { type: Number, default: 0.5 },
  socialOpenness: { type: Number, default: 0.5 },
}, { _id: false })

const relationshipStateSchema = new Schema({
  familiarity: { type: Number, default: 0 },
  trust: { type: Number, default: 0 },
  comfort: { type: Number, default: 0 },
  humorAcceptance: { type: Number, default: 0 },
}, { _id: false })

const conversationStateSchema = new Schema({
  turnCount: { type: Number, default: 0 },
  lastUserMessageLength: { type: Number, default: 0 },
  consecutiveShortReplies: { type: Number, default: 0 },
  userTopicChanges: { type: Number, default: 0 },
  sessionDurationMinutes: { type: Number, default: 0 },
}, { _id: false })

const memoryEventSchema = new Schema({
  id: { type: String, required: true },
  event: { type: String, required: true },
  importance: { type: Number, default: 0 },
  category: { type: String, default: "conversation_behavior" },
  level: { type: String, default: "ephemeral" },
  createdAt: { type: Date, default: Date.now },
  emotionalWeight: { type: Number, default: 0 },
  relationshipImpact: { type: Number, default: 0 },
  decayRate: { type: Number, default: 0.1 },
  lastRecalledAt: { type: Date, default: null },
  recallCount: { type: Number, default: 0 },
}, { _id: false })

const personaEventSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  data: { type: Schema.Types.Mixed, default: {} },
  sequence: { type: Number, required: true },
}, { _id: false })

const personaStateSchema = new Schema<IPersonaState>(
  {
    sessionId: { type: String, required: true, unique: true },
    config: { type: Schema.Types.Mixed, default: {} },
    runtime: { type: runtimeStateSchema, default: () => ({}) },
    relationship: { type: relationshipStateSchema, default: () => ({}) },
    conversation: { type: conversationStateSchema, default: () => ({}) },
    memory: {
      type: new Schema({ events: [memoryEventSchema] }, { _id: false }),
      default: () => ({ events: [] }),
    },
    policy: { type: Schema.Types.Mixed, default: {} },
    events: { type: [personaEventSchema], default: [] },
  },
  { timestamps: true }
)

personaStateSchema.index({ sessionId: 1 }, { unique: true })
personaStateSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 * 30 })

export const PersonaState =
  mongoose.models.PersonaState ?? mongoose.model<IPersonaState>("PersonaState", personaStateSchema)
