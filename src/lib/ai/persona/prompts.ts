import type {
  PersonaConfig,
  RuntimeState,
  RelationshipState,
  ConversationState,
} from "./types"
import type { MemoryStore } from "./memory"
import type { ModulationOutput } from "./policies"
import { getMemorySummary } from "./memory"

export interface PersonaPromptInput {
  config: PersonaConfig
  runtime: RuntimeState
  relationship: RelationshipState
  conversation: ConversationState
  memory?: MemoryStore
  modulation?: ModulationOutput
}

function formatEmotionalState(runtime: RuntimeState): string {
  const v = runtime.emotional.valence.toFixed(2)
  const a = runtime.emotional.arousal.toFixed(2)
  const d = runtime.emotional.dominance.toFixed(2)
  return `valence=${v}, arousal=${a}, dominance=${d}`
}

function formatRelationship(rel: RelationshipState): string {
  return `familiarity=${rel.familiarity.toFixed(2)}, trust=${rel.trust.toFixed(2)}, comfort=${rel.comfort.toFixed(2)}, humorAcceptance=${rel.humorAcceptance.toFixed(2)}`
}

export function buildModulationHints(modulation: ModulationOutput): string {
  const parts: string[] = []

  if (modulation.verbosity >= 0.7) {
    parts.push("Be verbose and elaborate in responses")
  } else if (modulation.verbosity <= 0.3) {
    parts.push("Keep responses concise and brief")
  }

  if (modulation.initiative >= 0.6) {
    parts.push("Take initiative in the conversation — ask questions and guide the discussion")
  }

  if (modulation.humor >= 0.5) {
    parts.push("Use warm, appropriate humor")
  }

  if (modulation.shouldInterrupt) {
    parts.push("Ready to interject when there is silence")
  }

  if (modulation.correctionUrgency >= 0.6) {
    parts.push("Provide direct correction when needed")
  } else if (modulation.correctionUrgency >= 0.3) {
    parts.push("Provide gentle correction when needed")
  }

  if (modulation.topicPersistence >= 0.6) {
    parts.push("Try to stay on the current topic")
  }

  return parts.length > 0 ? parts.join(". ") + "." : "Maintain a natural conversational flow."
}

export function buildSystemPrompt(input: PersonaPromptInput): string {
  const { config, runtime, relationship, conversation, memory, modulation } = input

  const sections: string[] = []

  sections.push(`You are ${config.name}.`)
  if (config.traits.length > 0) {
    sections.push(`Traits: ${config.traits.join(", ")}.`)
  }
  const currentTone = modulation?.tone ?? config.baseTone
  sections.push(`Speaking style: ${config.speakingStyle}. Tone: ${currentTone}.`)
  if (config.background) {
    sections.push(`Background: ${config.background}.`)
  }
  if (config.coreValues.length > 0) {
    sections.push(`Core values: ${config.coreValues.join(", ")}.`)
  }

  sections.push(
    `Teaching style: ${config.teachingStyle} | Conflict style: ${config.conflictStyle} | Humor: ${config.humorStyle} | Social boundaries: ${config.socialBoundaries}.`,
  )

  sections.push(`---`)
  sections.push(`Current emotional state: ${formatEmotionalState(runtime)}.`)
  sections.push(`Relationship: ${formatRelationship(relationship)}.`)

  if (memory && memory.events.length > 0) {
    const summary = getMemorySummary(memory)
    if (summary) {
      sections.push(`Memory:\n${summary}`)
    }
  }

  sections.push(`Conversation: turn ${conversation.turnCount}, session duration ${conversation.sessionDurationMinutes.toFixed(1)} minutes.`)

  if (modulation) {
    sections.push(`Behavioral hints: ${buildModulationHints(modulation)}`)
  }

  return sections.join("\n")
}

export function buildUserTurnPrompt(input: PersonaPromptInput, userMessage: string): string {
  const conv = input.conversation
  const context = `[turn ${conv.turnCount + 1} | duration ${conv.sessionDurationMinutes.toFixed(1)}m | short_replies: ${conv.consecutiveShortReplies} | topic_changes: ${conv.userTopicChanges}]`
  return `${context}\n${userMessage}`
}
