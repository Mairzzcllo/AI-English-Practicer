import { describe, it, expect } from "vitest"
import type { PersonaConfig, RuntimeState, RelationshipState, ConversationState } from "../persona/types"
import type { PersonaPromptInput } from "../persona/prompts"
import { runPipeline } from "./pipeline"

function baseConfig(overrides?: Partial<PersonaConfig>): PersonaConfig {
  return {
    name: "Sofia",
    traits: ["patient"],
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

function basePersonaInput(overrides?: Partial<PersonaPromptInput>): PersonaPromptInput {
  return {
    config: baseConfig(),
    runtime: baseRuntime(),
    relationship: baseRelationship(),
    conversation: baseConv(),
    ...overrides,
  }
}

describe("runPipeline", () => {
  it("returns intent, budget, and prompts for user message", () => {
    const result = runPipeline({ userMessage: "what does that mean", personaInput: basePersonaInput() })
    expect(result.intent.intent).toBe("ask_definition")
    expect(result.intent.confidence).toBeGreaterThan(0)
    expect(result.budget.maxSentences).toBeGreaterThan(0)
    expect(result.systemPrompt).toContain("Sofia")
    expect(result.userTurnPrompt).toContain("what does that mean")
  })

  it("includes response constraints in system prompt for explanation intents", () => {
    const result = runPipeline({ userMessage: "what does that mean", personaInput: basePersonaInput() })
    expect(result.systemPrompt).toContain("Response constraints")
    expect(result.systemPrompt).toContain("sentences")
  })

  it("includes no-explanation constraint for confirmation", () => {
    const result = runPipeline({ userMessage: "okay", personaInput: basePersonaInput() })
    expect(result.systemPrompt).toContain("Do not explain")
  })

  it("includes short-input constraint for brief messages", () => {
    const result = runPipeline({ userMessage: "yes", personaInput: basePersonaInput() })
    expect(result.budget.maxSentences).toBeLessThanOrEqual(2)
  })

  it("modulates budget with persona modulation input", () => {
    const defaultResult = runPipeline({
      userMessage: "tell me more about that",
      personaInput: basePersonaInput(),
    })
    const modulatedResult = runPipeline({
      userMessage: "tell me more about that",
      personaInput: basePersonaInput(),
      modulation: { engagement: 0.9, verbosity: 0.9 },
    })
    expect(modulatedResult.budget.maxSentences).toBeGreaterThanOrEqual(defaultResult.budget.maxSentences)
  })

  it("builds user turn prompt with conversation context", () => {
    const result = runPipeline({
      userMessage: "hello",
      personaInput: basePersonaInput(),
    })
    expect(result.userTurnPrompt).toContain("turn 9")
  })

  it("enforces minimalism: zeroes explanationDepth for non-teaching intents", () => {
    const result = runPipeline({
      userMessage: "hello",
      personaInput: basePersonaInput(),
    })
    expect(result.budget.explanationDepth).toBe(0)
  })

  it("enforces minimalism: preserves explanationDepth for teaching intents", () => {
    const result = runPipeline({
      userMessage: "what does the term asynchronous programming mean in javascript",
      personaInput: basePersonaInput(),
    })
    expect(result.budget.explanationDepth).toBeGreaterThan(0)
  })

  it("enforces minimalism: clamps short non-teaching input to 2 sentences", () => {
    const result = runPipeline({
      userMessage: "ok",
      personaInput: basePersonaInput(),
    })
    expect(result.budget.maxSentences).toBeLessThanOrEqual(2)
    expect(result.budget.explanationDepth).toBe(0)
  })

  it("detects no ambiguity for clear input", () => {
    const result = runPipeline({
      userMessage: "what does the term asynchronous programming mean in javascript",
      personaInput: basePersonaInput(),
    })
    expect(result.ambiguity.shouldCarryOn).toBe(false)
  })

  it("detects high ambiguity for empty input", () => {
    const result = runPipeline({ userMessage: "", personaInput: basePersonaInput() })
    expect(result.ambiguity.shouldCarryOn).toBe(true)
    expect(result.ambiguity.level).toBe("high")
  })

  it("includes carry-on hint in system prompt for ambiguous input", () => {
    const result = runPipeline({ userMessage: "", personaInput: basePersonaInput() })
    expect(result.systemPrompt).toContain("carry-on")
  })

  it("does not include carry-on hint for clear input", () => {
    const result = runPipeline({
      userMessage: "what does the term asynchronous programming mean in javascript",
      personaInput: basePersonaInput(),
    })
    expect(result.systemPrompt).not.toContain("carry-on")
  })

  it("handles empty input gracefully", () => {
    const result = runPipeline({ userMessage: "", personaInput: basePersonaInput() })
    expect(result.intent.intent).toBe("continue_conversation")
    expect(result.budget.maxSentences).toBeGreaterThanOrEqual(1)
    expect(result.systemPrompt).toContain("Sofia")
  })

  it("produces deterministic output for same inputs", () => {
    const input = { userMessage: "hello", personaInput: basePersonaInput() }
    const a = runPipeline(input)
    const b = runPipeline(input)
    expect(a.intent).toEqual(b.intent)
    expect(a.budget).toEqual(b.budget)
    expect(a.systemPrompt).toBe(b.systemPrompt)
  })

  it("returns momentum state in result", () => {
    const result = runPipeline({ userMessage: "hello", personaInput: basePersonaInput() })
    expect(result.momentum).toBeDefined()
    expect(typeof result.momentum.momentum).toBe("number")
    expect(typeof result.momentum.depth).toBe("number")
    expect(typeof result.momentum.responsiveness).toBe("number")
  })

  it("creates default momentum when none provided", () => {
    const result = runPipeline({ userMessage: "hello", personaInput: basePersonaInput() })
    expect(result.momentum.momentum).toBeGreaterThanOrEqual(0)
    expect(result.momentum.momentum).toBeLessThanOrEqual(1)
    expect(result.momentum.depth).toBeGreaterThanOrEqual(0)
    expect(result.momentum.responsiveness).toBeGreaterThanOrEqual(0)
  })

  it("includes momentum hint in system prompt for high momentum", () => {
    const highMomentum = { momentum: 0.8, depth: 0.3, responsiveness: 0.6 }
    const result = runPipeline({
      userMessage: "hello",
      personaInput: basePersonaInput(),
      momentum: highMomentum,
    })
    expect(result.systemPrompt).toContain("momentum")
    expect(result.systemPrompt).toContain("keep the flow")
  })

  it("includes momentum hint in system prompt for low momentum", () => {
    const lowMomentum = { momentum: 0.2, depth: 0.1, responsiveness: 0.3 }
    const result = runPipeline({
      userMessage: "hello",
      personaInput: basePersonaInput(),
      momentum: lowMomentum,
    })
    expect(result.systemPrompt).toContain("re-engage")
  })

  it("includes momentum numerical values in system prompt", () => {
    const result = runPipeline({
      userMessage: "hello",
      personaInput: basePersonaInput(),
    })
    expect(result.systemPrompt).toMatch(/Momentum: m=\d+\.\d+/)
  })

  it("modulates budget upward with high momentum", () => {
    const highMomentum = { momentum: 0.9, depth: 0.5, responsiveness: 0.9 }
    const lowMomentum = { momentum: 0.1, depth: 0.1, responsiveness: 0.1 }
    const highResult = runPipeline({
      userMessage: "hello",
      personaInput: basePersonaInput(),
      momentum: highMomentum,
    })
    const lowResult = runPipeline({
      userMessage: "hello",
      personaInput: basePersonaInput(),
      momentum: lowMomentum,
    })
    expect(highResult.budget.maxSentences).toBeGreaterThanOrEqual(lowResult.budget.maxSentences)
  })

  it("updates momentum from intent signal across calls", () => {
    const first = runPipeline({
      userMessage: "what does X mean",
      personaInput: basePersonaInput(),
    })
    expect(first.momentum.momentum).toBeGreaterThan(0.5)
    expect(first.momentum.depth).toBeGreaterThan(0)

    const second = runPipeline({
      userMessage: "um",
      personaInput: basePersonaInput(),
      momentum: first.momentum,
    })
    expect(second.momentum.momentum).toBeLessThan(first.momentum.momentum)
  })

  it("does not include momentum hint for balanced neutral state", () => {
    const result = runPipeline({
      userMessage: "hello",
      personaInput: basePersonaInput(),
      momentum: { momentum: 0.5, depth: 0.3, responsiveness: 0.5 },
    })
    expect(result.systemPrompt).not.toContain("Conversation momentum:")
  })

  it("uses intentOverride when provided", () => {
    const result = runPipeline({
      userMessage: "hello",
      personaInput: basePersonaInput(),
      intentOverride: { intent: "small_talk", confidence: 0.95 },
    })
    expect(result.intent.intent).toBe("small_talk")
    expect(result.intent.confidence).toBe(0.95)
  })

  it("intentOverride affects derived budget", () => {
    const result = runPipeline({
      userMessage: "what does the term asynchronous programming mean",
      personaInput: basePersonaInput(),
      intentOverride: { intent: "ask_definition", confidence: 0.9 },
    })
    expect(result.budget.explanationDepth).toBeGreaterThan(0)
  })

  it("intentOverride affects momentum updates", () => {
    const base = runPipeline({ userMessage: "hello", personaInput: basePersonaInput() })
    const overridden = runPipeline({
      userMessage: "hello",
      personaInput: basePersonaInput(),
      intentOverride: { intent: "ask_definition", confidence: 0.9 },
    })
    expect(overridden.momentum.depth).toBeGreaterThan(base.momentum.depth)
  })
})
