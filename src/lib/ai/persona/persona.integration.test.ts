import { describe, it, expect, beforeEach } from "vitest"
import type { PersonaConfig, BehavioralPolicy, RuntimeState, RelationshipState } from "./types"
import { PersonaAgent } from "./persona"
import { runPipeline } from "../conversation/pipeline"
import { createDefaultMomentumState, momentumToBudgetMultiplier } from "../conversation/momentum"

function baseConfig(overrides?: Partial<PersonaConfig>): PersonaConfig {
  return {
    name: "Sofia",
    traits: ["patient", "encouraging"],
    speakingStyle: "conversational",
    baseTone: "friendly",
    coreValues: ["help", "learn"],
    attachmentStyle: "secure",
    initiativeBias: 0.5,
    humorStyle: "warm",
    conflictStyle: "diplomatic",
    teachingStyle: "socratic",
    socialBoundaries: "casual",
    ...overrides,
  }
}

describe("Integration: Short input edge cases", () => {
  describe("via runPipeline", () => {
    it("empty string yields high ambiguity and carry-on", () => {
      const result = runPipeline({ userMessage: "", personaInput: { config: baseConfig(), runtime: { emotional: { valence: 0, arousal: 0.5, dominance: 0.5 }, energy: 0.7, engagement: 0.5, socialOpenness: 0.5 }, relationship: { familiarity: 0, trust: 0, comfort: 0, humorAcceptance: 0 }, conversation: { turnCount: 0, lastUserMessageLength: 0, consecutiveShortReplies: 0, userTopicChanges: 0, sessionDurationMinutes: 0 }, memory: { events: [] } } })
      expect(result.ambiguity.shouldCarryOn).toBe(true)
      expect(result.ambiguity.level).toBe("high")
      expect(result.intent.intent).toBe("continue_conversation")
      expect(result.intent.confidence).toBe(0.35)
      expect(result.systemPrompt).toContain("carry-on")
    })

    it("single character gets very low confidence and short budget", () => {
      const result = runPipeline({ userMessage: "a", personaInput: { config: baseConfig(), runtime: { emotional: { valence: 0, arousal: 0.5, dominance: 0.5 }, energy: 0.7, engagement: 0.5, socialOpenness: 0.5 }, relationship: { familiarity: 0, trust: 0, comfort: 0, humorAcceptance: 0 }, conversation: { turnCount: 0, lastUserMessageLength: 0, consecutiveShortReplies: 0, userTopicChanges: 0, sessionDurationMinutes: 0 }, memory: { events: [] } } })
      expect(result.intent.confidence).toBeLessThan(0.3)
      expect(result.budget.maxSentences).toBeLessThanOrEqual(2)
      expect(result.budget.explanationDepth).toBe(0)
    })

    it("single word 'yes' classified as confirmation, clamped short", () => {
      const result = runPipeline({ userMessage: "yes", personaInput: { config: baseConfig(), runtime: { emotional: { valence: 0, arousal: 0.5, dominance: 0.5 }, energy: 0.7, engagement: 0.5, socialOpenness: 0.5 }, relationship: { familiarity: 0, trust: 0, comfort: 0, humorAcceptance: 0 }, conversation: { turnCount: 0, lastUserMessageLength: 0, consecutiveShortReplies: 0, userTopicChanges: 0, sessionDurationMinutes: 0 }, memory: { events: [] } } })
      expect(result.intent.intent).toBe("confirmation")
      expect(result.budget.maxSentences).toBeLessThanOrEqual(2)
      expect(result.budget.explanationDepth).toBe(0)
    })

    it("single word 'ok' classified as confirmation, no explanation", () => {
      const result = runPipeline({ userMessage: "ok", personaInput: { config: baseConfig(), runtime: { emotional: { valence: 0, arousal: 0.5, dominance: 0.5 }, energy: 0.7, engagement: 0.5, socialOpenness: 0.5 }, relationship: { familiarity: 0, trust: 0, comfort: 0, humorAcceptance: 0 }, conversation: { turnCount: 0, lastUserMessageLength: 0, consecutiveShortReplies: 0, userTopicChanges: 0, sessionDurationMinutes: 0 }, memory: { events: [] } } })
      expect(result.intent.intent).toBe("confirmation")
      expect(result.systemPrompt).toContain("Do not explain")
    })

    it("very short question 'what is X' preserves intent but clamps budget", () => {
      const result = runPipeline({ userMessage: "what is X", personaInput: { config: baseConfig(), runtime: { emotional: { valence: 0, arousal: 0.5, dominance: 0.5 }, energy: 0.7, engagement: 0.5, socialOpenness: 0.5 }, relationship: { familiarity: 0, trust: 0, comfort: 0, humorAcceptance: 0 }, conversation: { turnCount: 0, lastUserMessageLength: 0, consecutiveShortReplies: 0, userTopicChanges: 0, sessionDurationMinutes: 0 }, memory: { events: [] } } })
      expect(result.intent.intent).toBe("ask_definition")
      expect(result.budget.maxSentences).toBeLessThanOrEqual(2)
      expect(result.budget.explanationDepth).toBe(0)
    })

    it("multiple words below 20 chars still clamped", () => {
      const result = runPipeline({ userMessage: "what is js", personaInput: { config: baseConfig(), runtime: { emotional: { valence: 0, arousal: 0.5, dominance: 0.5 }, energy: 0.7, engagement: 0.5, socialOpenness: 0.5 }, relationship: { familiarity: 0, trust: 0, comfort: 0, humorAcceptance: 0 }, conversation: { turnCount: 0, lastUserMessageLength: 0, consecutiveShortReplies: 0, userTopicChanges: 0, sessionDurationMinutes: 0 }, memory: { events: [] } } })
      expect(result.intent.intent).toBe("ask_definition")
      expect(result.budget.maxSentences).toBeLessThanOrEqual(2)
    })
  })

  describe("via PersonaAgent (full loop)", () => {
    let agent: PersonaAgent

    beforeEach(() => {
      agent = new PersonaAgent(baseConfig())
    })

    it("very short truthy userMessage processes without crashing", () => {
      const result = agent.processTurn({ userMessage: "." })
      expect(result.intent).toBeDefined()
      expect(result.intent!.intent).toBe("continue_conversation")
      expect(result.intent!.confidence).toBe(0.2)
      expect(result.budget).toBeDefined()
      expect(result.momentum).toBeDefined()
    })

    it("single char userMessage produces low confidence and state effects", () => {
      const result = agent.processTurn({ userMessage: "x" })
      expect(result.intent!.confidence).toBeLessThan(0.3)
      expect(result.budget!.maxSentences).toBeLessThanOrEqual(2)
      expect(result.momentum!.momentum).toBeLessThan(0.5)
    })

    it("single word 'um' triggers hesitation signal", () => {
      const result = agent.processTurn({ userMessage: "um" })
      expect(result.intent!.intent).toBe("hesitation")
      const state = agent.getState()
      expect(state.runtime.emotional.dominance).toBeLessThan(0.5)
    })
  })
})

describe("Integration: Fuzzy intent scenarios", () => {
  describe("via runPipeline", () => {
    it("input matching multiple patterns picks highest score", () => {
      const result = runPipeline({ userMessage: "what does that mean and how are you", personaInput: { config: baseConfig(), runtime: { emotional: { valence: 0, arousal: 0.5, dominance: 0.5 }, energy: 0.7, engagement: 0.5, socialOpenness: 0.5 }, relationship: { familiarity: 0, trust: 0, comfort: 0, humorAcceptance: 0 }, conversation: { turnCount: 0, lastUserMessageLength: 0, consecutiveShortReplies: 0, userTopicChanges: 0, sessionDurationMinutes: 0 }, memory: { events: [] } } })
      expect(result.intent.intent).toBe("ask_definition")
    })

    it("input matching only low-weight patterns gets low confidence", () => {
      const result = runPipeline({ userMessage: "well", personaInput: { config: baseConfig(), runtime: { emotional: { valence: 0, arousal: 0.5, dominance: 0.5 }, energy: 0.7, engagement: 0.5, socialOpenness: 0.5 }, relationship: { familiarity: 0, trust: 0, comfort: 0, humorAcceptance: 0 }, conversation: { turnCount: 0, lastUserMessageLength: 0, consecutiveShortReplies: 0, userTopicChanges: 0, sessionDurationMinutes: 0 }, memory: { events: [] } } })
      expect(result.intent.intent).toBe("hesitation")
      expect(result.intent.confidence).toBeLessThanOrEqual(0.35)
    })

    it("no pattern match falls back to continue_conversation with low confidence", () => {
      const result = runPipeline({ userMessage: "something completely random no match", personaInput: { config: baseConfig(), runtime: { emotional: { valence: 0, arousal: 0.5, dominance: 0.5 }, energy: 0.7, engagement: 0.5, socialOpenness: 0.5 }, relationship: { familiarity: 0, trust: 0, comfort: 0, humorAcceptance: 0 }, conversation: { turnCount: 0, lastUserMessageLength: 0, consecutiveShortReplies: 0, userTopicChanges: 0, sessionDurationMinutes: 0 }, memory: { events: [] } } })
      expect(result.intent.intent).toBe("continue_conversation")
      expect(result.intent.confidence).toBe(0.35)
    })

    it("conflicting patterns tied in score picks first encountered", () => {
      const result = runPipeline({ userMessage: "wow I feel amazing", personaInput: { config: baseConfig(), runtime: { emotional: { valence: 0, arousal: 0.5, dominance: 0.5 }, energy: 0.7, engagement: 0.5, socialOpenness: 0.5 }, relationship: { familiarity: 0, trust: 0, comfort: 0, humorAcceptance: 0 }, conversation: { turnCount: 0, lastUserMessageLength: 0, consecutiveShortReplies: 0, userTopicChanges: 0, sessionDurationMinutes: 0 }, memory: { events: [] } } })
      expect(result.intent.intent).toBe("emotional_expression")
    })

    it("empty after trim returns default continue_conversation low confidence", () => {
      const result = runPipeline({ userMessage: "   ", personaInput: { config: baseConfig(), runtime: { emotional: { valence: 0, arousal: 0.5, dominance: 0.5 }, energy: 0.7, engagement: 0.5, socialOpenness: 0.5 }, relationship: { familiarity: 0, trust: 0, comfort: 0, humorAcceptance: 0 }, conversation: { turnCount: 0, lastUserMessageLength: 0, consecutiveShortReplies: 0, userTopicChanges: 0, sessionDurationMinutes: 0 }, memory: { events: [] } } })
      expect(result.intent.intent).toBe("continue_conversation")
      expect(result.ambiguity.shouldCarryOn).toBe(true)
    })
  })

  describe("via PersonaAgent", () => {
    let agent: PersonaAgent

    beforeEach(() => {
      agent = new PersonaAgent(baseConfig())
    })

    it("fuzzy greeting triggers openness signal", () => {
      const result = agent.processTurn({ userMessage: "hey how are things" })
      expect(result.intent!.intent).toBe("small_talk")
      const state = agent.getState()
      expect(state.runtime.socialOpenness).toBeGreaterThan(0.5)
    })

    it("input matching both definition and correction picks higher confidence intent", () => {
      const result = agent.processTurn({ userMessage: "what does that mean and is it correct" })
      expect(result.intent!.intent).toBe("ask_definition")
    })
  })
})

describe("Integration: Low confidence scenarios", () => {
  describe("via runPipeline", () => {
    it("low confidence (< 0.3) clamps maxSentences and zeros explanationDepth", () => {
      const result = runPipeline({ userMessage: "right", personaInput: { config: baseConfig(), runtime: { emotional: { valence: 0, arousal: 0.5, dominance: 0.5 }, energy: 0.7, engagement: 0.5, socialOpenness: 0.5 }, relationship: { familiarity: 0, trust: 0, comfort: 0, humorAcceptance: 0 }, conversation: { turnCount: 0, lastUserMessageLength: 0, consecutiveShortReplies: 0, userTopicChanges: 0, sessionDurationMinutes: 0 }, memory: { events: [] } } })
      expect(result.intent.confidence).toBeLessThanOrEqual(0.35)
      expect(result.budget.maxSentences).toBeLessThanOrEqual(2)
      expect(result.budget.explanationDepth).toBe(0)
    })

    it("low confidence combined with short input still works", () => {
      const result = runPipeline({ userMessage: "um", personaInput: { config: baseConfig(), runtime: { emotional: { valence: 0, arousal: 0.5, dominance: 0.5 }, energy: 0.7, engagement: 0.5, socialOpenness: 0.5 }, relationship: { familiarity: 0, trust: 0, comfort: 0, humorAcceptance: 0 }, conversation: { turnCount: 0, lastUserMessageLength: 0, consecutiveShortReplies: 0, userTopicChanges: 0, sessionDurationMinutes: 0 }, memory: { events: [] } } })
      expect(result.intent.intent).toBe("hesitation")
      expect(result.intent.confidence).toBeLessThanOrEqual(0.35)
      expect(result.budget.maxSentences).toBeLessThanOrEqual(2)
    })

    it("momentum gets penalty from low confidence and short input", () => {
      const defaultMomentum = createDefaultMomentumState()
      const lowConfidence = runPipeline({ userMessage: "a", personaInput: { config: baseConfig(), runtime: { emotional: { valence: 0, arousal: 0.5, dominance: 0.5 }, energy: 0.7, engagement: 0.5, socialOpenness: 0.5 }, relationship: { familiarity: 0, trust: 0, comfort: 0, humorAcceptance: 0 }, conversation: { turnCount: 0, lastUserMessageLength: 0, consecutiveShortReplies: 0, userTopicChanges: 0, sessionDurationMinutes: 0 }, memory: { events: [] } }, momentum: defaultMomentum })
      expect(lowConfidence.intent.confidence).toBe(0.2)
      expect(lowConfidence.momentum.momentum).toBeLessThan(defaultMomentum.momentum)
    })
  })

  describe("via PersonaAgent", () => {
    let agent: PersonaAgent

    beforeEach(() => {
      agent = new PersonaAgent(baseConfig())
    })

    it("low confidence input produces budget clamp and momentum drop in agent", () => {
      const result = agent.processTurn({ userMessage: "a" })
      expect(result.intent!.confidence).toBe(0.2)
      expect(result.budget!.maxSentences).toBeLessThanOrEqual(2)
      expect(result.momentum!.momentum).toBeLessThan(0.5)
    })

    it("low confidence hesitation affects runtime state", () => {
      const result = agent.processTurn({ userMessage: "um" })
      expect(result.intent!.intent).toBe("hesitation")
      expect(result.intent!.confidence).toBeLessThanOrEqual(0.35)
      const state = agent.getState()
      expect(state.runtime.emotional.dominance).toBeLessThan(0.5)
    })
  })
})

describe("Integration: Intent switching across turns", () => {
  let agent: PersonaAgent

  beforeEach(() => {
    agent = new PersonaAgent(baseConfig())
  })

  it("switches from ask_definition to confirmation, budget adapts", () => {
    const first = agent.processTurn({ userMessage: "what does closure mean in javascript" })
    expect(first.intent!.intent).toBe("ask_definition")
    expect(first.budget!.explanationDepth).toBeGreaterThan(0)

    const second = agent.processTurn({ userMessage: "okay I understand" })
    expect(second.intent!.intent).toBe("confirmation")
    expect(second.budget!.explanationDepth).toBe(0)
    expect(second.budget!.maxSentences).toBeLessThanOrEqual(2)
  })

  it("switches from confirmation to ask_correction, intent and signal effects", () => {
    agent.processTurn({ userMessage: "okay" })
    const second = agent.processTurn({ userMessage: "did I say that right" })
    expect(second.intent!.intent).toBe("ask_correction")
    expect(second.intent!.confidence).toBeGreaterThan(0.8)
    const state = agent.getState()
    expect(state.runtime.emotional.valence).toBeLessThan(0.5)
  })

  it("switches from hesitation to small_talk, momentum recovers", () => {
    const first = agent.processTurn({ userMessage: "um well I mean" })
    expect(first.intent!.intent).toBe("hesitation")
    const firstMomentum = first.momentum!.momentum

    const second = agent.processTurn({ userMessage: "how are you" })
    expect(second.intent!.intent).toBe("small_talk")
    expect(second.momentum!.momentum).toBeGreaterThanOrEqual(firstMomentum)
  })

  it("cycles through 3 different intents correctly", () => {
    const r1 = agent.processTurn({ userMessage: "what is TypeScript" })
    expect(r1.intent!.intent).toBe("ask_definition")
    expect(r1.momentum!.depth).toBeGreaterThan(0)

    const r2 = agent.processTurn({ userMessage: "got it" })
    expect(r2.intent!.intent).toBe("confirmation")
    expect(r2.momentum!.momentum).toBeGreaterThanOrEqual(0)

    const r3 = agent.processTurn({ userMessage: "I feel really happy about this" })
    expect(r3.intent!.intent).toBe("emotional_expression")
    expect(r3.budget!.maxSentences).toBeGreaterThanOrEqual(2)
  })

  it("short input alternated with long input in a sequence", () => {
    const r1 = agent.processTurn({ userMessage: "ok" })
    expect(r1.intent!.intent).toBe("confirmation")

    const r2 = agent.processTurn({ userMessage: "what does async mean in javascript" })
    expect(r2.intent!.intent).toBe("ask_definition")
    expect(r2.budget!.explanationDepth).toBeGreaterThan(0)
    expect(r2.momentum!.momentum).toBeGreaterThan(r1.momentum!.momentum)
  })

  it("sustained ask_definition builds depth momentum", () => {
    agent.processTurn({ userMessage: "what is a promise" })
    agent.processTurn({ userMessage: "how does async await work" })
    const third = agent.processTurn({ userMessage: "what about error handling" })
    expect(third.momentum!.depth).toBeGreaterThan(0.2)
  })

  it("confirmation after definition drops depth momentum", () => {
    agent.processTurn({ userMessage: "what does reduce do" })
    const afterDepth = agent.getState().momentum.depth

    agent.processTurn({ userMessage: "yeah I see" })
    const afterConfirm = agent.getState().momentum.depth
    expect(afterConfirm).toBeLessThan(afterDepth)
  })
})

describe("Integration: Full-loop mutual modulation scenarios", () => {
  let agent: PersonaAgent

  beforeEach(() => {
    agent = new PersonaAgent(baseConfig())
  })

  it("complete 6-stage loop produces all outputs", () => {
    const result = agent.processTurn({ userMessage: "what does asynchronous programming mean" })
    expect(result.intent).toBeDefined()
    expect(result.budget).toBeDefined()
    expect(result.momentum).toBeDefined()
    expect(result.modulation).toBeDefined()
    expect(result.appliedRules).toBeDefined()
    expect(result.needsIntervention).toBeDefined()
    expect(result.isEstablished).toBeDefined()
  })

  it("persona engagement modulates budget: high engagement increases sentences", () => {
    const highEngagement = new PersonaAgent(baseConfig(), {
      initialRuntime: { engagement: 0.9 } as Partial<RuntimeState>,
    })
    const lowEngagement = new PersonaAgent(baseConfig(), {
      initialRuntime: { engagement: 0.1 } as Partial<RuntimeState>,
    })
    const highResult = highEngagement.processTurn({ userMessage: "tell me about closures" })
    const lowResult = lowEngagement.processTurn({ userMessage: "tell me about closures" })
    expect(highResult.budget!.maxSentences).toBeGreaterThanOrEqual(lowResult.budget!.maxSentences)
  })

  it("persona verbosity modulates budget: high verbosity increases sentences", () => {
    const verbose = new PersonaAgent(baseConfig(), {
      initialPolicy: { verbosity: 0.9 } as BehavioralPolicy,
    })
    const terse = new PersonaAgent(baseConfig(), {
      initialPolicy: { verbosity: 0.1 } as BehavioralPolicy,
    })
    const verboseResult = verbose.processTurn({ userMessage: "what is a closure" })
    const terseResult = terse.processTurn({ userMessage: "what is a closure" })
    expect(verboseResult.budget!.maxSentences).toBeGreaterThanOrEqual(terseResult.budget!.maxSentences)
  })

  it("intent state -> derived signal -> emotion update: ask_definition boosts engagement", () => {
    agent.processTurn({ userMessage: "what does functional programming mean" })
    const state = agent.getState()
    expect(state.runtime.engagement).toBeGreaterThan(0.5)
    expect(state.runtime.emotional.valence).toBeGreaterThanOrEqual(0)
  })

  it("intent state -> derived signal -> emotion update: correction_needed lowers valence", () => {
    agent.processTurn({ userMessage: "did I say that right" })
    const state = agent.getState()
    expect(state.runtime.emotional.valence).toBeLessThan(0.5)
  })

  it("momentum feeds back into budget via multiplier", () => {
    const lowM = createDefaultMomentumState()
    const highM = { momentum: 0.9, depth: 0.5, responsiveness: 0.9 }
    expect(momentumToBudgetMultiplier(highM)).toBeGreaterThan(momentumToBudgetMultiplier(lowM))
  })

  it("persona familiarity modulates budget over time", () => {
    const familiar = new PersonaAgent(baseConfig(), {
      initialRelationship: { familiarity: 0.9 } as Partial<RelationshipState>,
    })
    const unfamiliar = new PersonaAgent(baseConfig())
    const familiarResult = familiar.processTurn({ userMessage: "hello there" })
    const unfamiliarResult = unfamiliar.processTurn({ userMessage: "hello there" })
    expect(familiarResult.budget!.maxSentences).toBeGreaterThanOrEqual(unfamiliarResult.budget!.maxSentences)
  })

  it("running conversation with varied intents accumulates meaningful state", () => {
    agent.processTurn({ userMessage: "hi there" })
    agent.processTurn({ userMessage: "what is TypeScript" })
    agent.processTurn({ userMessage: "I feel great about learning this" })
    agent.processTurn({ userMessage: "got it thanks" })
    const state = agent.getState()
    expect(state.conversation.turnCount).toBe(4)
    expect(state.runtime.engagement).toBeGreaterThan(0)
    expect(state.relationship.familiarity).toBeGreaterThan(0)
    expect(state.momentum.momentum).toBeGreaterThan(0)
    expect(state.memory.events.length).toBeGreaterThanOrEqual(1)
  })

  it("momentum rises with sustained deep questions, falls on short replies", () => {
    agent.processTurn({ userMessage: "what is a promise in javascript" })
    const afterFirst = agent.getState().momentum.momentum

    agent.processTurn({ userMessage: "how does async await compare to promises" })
    const afterSecond = agent.getState().momentum.momentum
    expect(afterSecond).toBeGreaterThanOrEqual(afterFirst)

    agent.processTurn({ userMessage: "x" })
    const afterShort = agent.getState().momentum.momentum
    expect(afterShort).toBeLessThan(afterSecond)
  })

  it("sustained positive interaction eventually establishes relationship", () => {
    for (let i = 0; i < 15; i++) {
      agent.processTurn({ userMessage: "I feel great about this" })
    }
    expect(agent.isEstablished()).toBe(true)
  })

  it("momentum modulates pipeline budget multiplier across turns", () => {
    agent.processTurn({ userMessage: "what is a closure" })
    const afterQuestion = agent.getState().momentum
    expect(momentumToBudgetMultiplier(afterQuestion)).toBeGreaterThanOrEqual(1)

    agent.processTurn({ userMessage: "ok" })
    agent.processTurn({ userMessage: "um" })
    const afterWeak = agent.getState().momentum
    expect(momentumToBudgetMultiplier(afterWeak)).toBeLessThanOrEqual(1)
  })

  it("signal-only processTurn preserves backward compatibility", () => {
    const signalResult = agent.processTurn({ signal: { type: "silence", intensity: 0.5 } })
    expect(signalResult.intent).toBeUndefined()
    expect(signalResult.budget).toBeUndefined()
    expect(signalResult.momentum).toBeUndefined()
    expect(signalResult.modulation).toBeDefined()
    expect(signalResult.appliedRules).toBeDefined()
  })

  it("intentOverride overrides heuristic in full loop", () => {
    const result = agent.processTurn({ userMessage: "hello there how are you", intentOverride: { intent: "ask_definition", confidence: 0.95 } })
    expect(result.intent!.intent).toBe("ask_definition")
    expect(result.budget!.explanationDepth).toBeGreaterThan(0)
  })

  it("long conversation maintains bounded state values", () => {
    for (let i = 0; i < 20; i++) {
      agent.processTurn({ userMessage: `this is turn number ${i} in our conversation` })
    }
    const state = agent.getState()
    expect(state.conversation.turnCount).toBe(20)
    expect(state.runtime.engagement).toBeGreaterThanOrEqual(0)
    expect(state.runtime.engagement).toBeLessThanOrEqual(1)
    expect(state.runtime.emotional.valence).toBeGreaterThanOrEqual(-1)
    expect(state.runtime.emotional.valence).toBeLessThanOrEqual(1)
    expect(state.momentum.momentum).toBeGreaterThanOrEqual(0)
    expect(state.momentum.momentum).toBeLessThanOrEqual(1)
    expect(state.momentum.depth).toBeGreaterThanOrEqual(0)
    expect(state.momentum.depth).toBeLessThanOrEqual(1)
    expect(state.momentum.responsiveness).toBeGreaterThanOrEqual(0)
    expect(state.momentum.responsiveness).toBeLessThanOrEqual(1)
  })
})
