import { describe, it, expect } from "vitest"
import type { PersonaConfig, RuntimeState, RelationshipState, ConversationState } from "./types"
import type { ModulationOutput } from "./policies"
import type { ResponseBudget } from "../conversation/types"
import { buildSystemPrompt, buildUserTurnPrompt, buildModulationHints, type PersonaPromptInput } from "./prompts"
import { createMemoryEvent } from "./types"
import { createMemoryStore, storeEvent } from "./memory"

function baseConfig(overrides?: Partial<PersonaConfig>): PersonaConfig {
  return {
    name: "Sofia",
    traits: ["patient", "encouraging", "insightful"],
    speakingStyle: "warm and conversational",
    baseTone: "friendly",
    background: "ESL teacher with 10 years experience",
    coreValues: ["patience", "growth mindset", "cultural understanding"],
    attachmentStyle: "secure",
    initiativeBias: 0.5,
    humorStyle: "warm",
    conflictStyle: "diplomatic",
    teachingStyle: "socratic",
    socialBoundaries: "casual",
    ...overrides,
  }
}

function baseRuntime(overrides?: Partial<RuntimeState>): RuntimeState {
  return {
    emotional: { valence: 0.3, arousal: 0.6, dominance: 0.5 },
    energy: 0.7,
    engagement: 0.6,
    socialOpenness: 0.5,
    ...overrides,
  }
}

function baseRelationship(overrides?: Partial<RelationshipState>): RelationshipState {
  return {
    familiarity: 0.4,
    trust: 0.5,
    comfort: 0.4,
    humorAcceptance: 0.3,
    ...overrides,
  }
}

function baseConv(overrides?: Partial<ConversationState>): ConversationState {
  return {
    turnCount: 8,
    lastUserMessageLength: 20,
    consecutiveShortReplies: 0,
    userTopicChanges: 1,
    sessionDurationMinutes: 5,
    ...overrides,
  }
}

function baseModulation(overrides?: Partial<ModulationOutput>): ModulationOutput {
  return {
    verbosity: 0.5,
    initiative: 0.5,
    humor: 0.3,
    shouldInterrupt: false,
    correctionUrgency: 0.3,
    emotionalMirroring: 0.5,
    topicPersistence: 0.5,
    tone: "warm",
    ...overrides,
  }
}

function buildInput(overrides?: Partial<PersonaPromptInput>): PersonaPromptInput {
  return {
    config: baseConfig(),
    runtime: baseRuntime(),
    relationship: baseRelationship(),
    conversation: baseConv(),
    ...overrides,
  }
}

describe("buildSystemPrompt", () => {
  it("includes persona name and traits", () => {
    const prompt = buildSystemPrompt(buildInput())
    expect(prompt).toContain("Sofia")
    expect(prompt).toContain("patient")
    expect(prompt).toContain("encouraging")
  })

  it("includes speaking style and tone", () => {
    const prompt = buildSystemPrompt(buildInput())
    expect(prompt).toContain("warm and conversational")
    expect(prompt).toContain("friendly")
  })

  it("includes background when present", () => {
    const prompt = buildSystemPrompt(buildInput())
    expect(prompt).toContain("ESL teacher with 10 years experience")
  })

  it("does not include background line when absent", () => {
    const prompt = buildSystemPrompt(buildInput({ config: baseConfig({ background: undefined }) }))
    expect(prompt).not.toContain("Background")
  })

  it("includes core values", () => {
    const prompt = buildSystemPrompt(buildInput())
    expect(prompt).toContain("patience")
    expect(prompt).toContain("growth mindset")
  })

  it("includes emotional state context", () => {
    const prompt = buildSystemPrompt(buildInput())
    expect(prompt).toContain("valence")
    expect(prompt).toContain("0.3")
    expect(prompt).toContain("arousal")
  })

  it("includes relationship context", () => {
    const prompt = buildSystemPrompt(buildInput())
    expect(prompt).toContain("familiarity")
    expect(prompt).toContain("trust")
  })

  it("includes memory summary when memory is provided", () => {
    const mem = storeEvent(createMemoryStore(), createMemoryEvent("User loves cooking", "user_preference", 0.5))
    const prompt = buildSystemPrompt(buildInput({ memory: mem }))
    expect(prompt).toContain("User loves cooking")
  })

  it("includes modulation hints when modulation is provided", () => {
    const prompt = buildSystemPrompt(buildInput({ modulation: baseModulation() }))
    expect(prompt).toContain("Behavioral hints")
    expect(prompt).toContain("gentle correction")
  })

  it("uses dynamic tone from modulation when provided", () => {
    const prompt = buildSystemPrompt(buildInput({ modulation: baseModulation({ tone: "playful" }) }))
    expect(prompt).toContain("Tone: playful")
    expect(prompt).not.toContain("Tone: friendly")
  })

  it("falls back to baseTone when modulation is not provided", () => {
    const prompt = buildSystemPrompt(buildInput())
    expect(prompt).toContain("Tone: friendly")
  })

  it("includes teaching style and social boundaries", () => {
    const prompt = buildSystemPrompt(buildInput())
    expect(prompt).toContain("socratic")
    expect(prompt).toContain("casual")
  })

  it("includes conversation stats", () => {
    const prompt = buildSystemPrompt(buildInput())
    expect(prompt).toContain("turn 8")
  })

  it("includes response constraints when budget is provided", () => {
    const budget: ResponseBudget = { maxSentences: 2, explanationDepth: 0 }
    const prompt = buildSystemPrompt(buildInput({ budget }))
    expect(prompt).toContain("Response constraints")
    expect(prompt).toContain("2 sentences")
    expect(prompt).toContain("Do not explain")
  })

  it("includes explanation depth hint when budget has high depth", () => {
    const budget: ResponseBudget = { maxSentences: 4, explanationDepth: 0.9 }
    const prompt = buildSystemPrompt(buildInput({ budget }))
    expect(prompt).toContain("full in-depth explanation")
  })

  it("produces deterministic output for same inputs", () => {
    const a = buildSystemPrompt(buildInput())
    const b = buildSystemPrompt(buildInput())
    expect(a).toBe(b)
  })
})

describe("buildUserTurnPrompt", () => {
  it("wraps user message with context", () => {
    const result = buildUserTurnPrompt(buildInput(), "I like learning English")
    expect(result).toContain("I like learning English")
  })

  it("includes conversation context", () => {
    const result = buildUserTurnPrompt(buildInput(), "Hello")
    expect(result).toContain("turn 9")
  })
})

describe("buildModulationHints", () => {
  it("generates hint text from modulation output", () => {
    const hints = buildModulationHints(baseModulation({ verbosity: 0.8, humor: 0.6 }))
    expect(hints).toContain("verbose")
    expect(hints).toContain("humor")
  })

  it("indicates low verbosity as concise", () => {
    const hints = buildModulationHints(baseModulation({ verbosity: 0.2 }))
    expect(hints).toContain("concise")
  })

  it("indicates high initiative as proactive", () => {
    const hints = buildModulationHints(baseModulation({ initiative: 0.8 }))
    expect(hints).toContain("initiative")
  })

  it("indicates interruption readiness", () => {
    const hints = buildModulationHints(baseModulation({ shouldInterrupt: true }))
    expect(hints).toContain("interject")
  })

  it("indicates correction urgency", () => {
    const hints = buildModulationHints(baseModulation({ correctionUrgency: 0.7 }))
    expect(hints).toContain("correction")
  })

  it("returns neutral hints for default modulation", () => {
    const hints = buildModulationHints(baseModulation())
    expect(hints).toBeTruthy()
  })
})
