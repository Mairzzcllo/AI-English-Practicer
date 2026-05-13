import { describe, it, expect, beforeEach } from "vitest"
import type { PersonaConfig, BehavioralPolicy, RuntimeState, RelationshipState, ConversationSignal } from "./types"
import { PersonaAgent, type PersonaAgentOptions, type ProcessTurnInput } from "./persona"
import { type RuleEvaluator } from "./mutation"

function baseConfig(overrides?: Partial<PersonaConfig>): PersonaConfig {
  return {
    name: "test-tutor",
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

function silenceSignal(): ConversationSignal {
  return { type: "silence", intensity: 0.5 }
}

describe("PersonaAgent", () => {
  let agent: PersonaAgent

  beforeEach(() => {
    agent = new PersonaAgent(baseConfig())
  })

  describe("constructor", () => {
    it("creates agent with default state", () => {
      const state = agent.getState()
      expect(state.config.name).toBe("test-tutor")
      expect(state.runtime.energy).toBe(0.7)
      expect(state.relationship.familiarity).toBe(0)
      expect(state.conversation.turnCount).toBe(0)
      expect(state.memory.events).toHaveLength(0)
    })

    it("accepts custom options", () => {
      const customRule: RuleEvaluator = {
        rule: { id: "custom", condition: "always", target: "engagement", delta: 0.1, description: "" },
        evaluate: () => true,
      }
      const options: PersonaAgentOptions = {
        initialPolicy: { verbosity: 0.9, initiativeLevel: 0.8, humorLevel: 0.7 } as BehavioralPolicy,
        evaluators: [customRule],
      }
      const customAgent = new PersonaAgent(baseConfig({ name: "custom" }), options)
      const state = customAgent.getState()
      expect(state.policy.verbosity).toBe(0.9)
      expect(state.policy.initiativeLevel).toBe(0.8)
    })
  })

  describe("processTurn", () => {
    it("returns a complete process turn result", () => {
      const input: ProcessTurnInput = { signal: { type: "long_reply", intensity: 0.7 } }
      const result = agent.processTurn(input)
      expect(result).toHaveProperty("modulation")
      expect(result).toHaveProperty("appliedRules")
      expect(result).toHaveProperty("needsIntervention")
      expect(result).toHaveProperty("isEstablished")
      expect(result).toHaveProperty("memoryEvent")
    })

    it("updates internal state after processing", () => {
      agent.processTurn({ signal: { type: "positive_sentiment", intensity: 0.8 } })
      const state = agent.getState()
      expect(state.runtime.emotional.valence).toBeGreaterThan(0)
      expect(state.conversation.turnCount).toBe(1)
    })

    it("accepts userMessage for memory extraction", () => {
      const result = agent.processTurn({
        signal: { type: "long_reply", intensity: 0.7 },
        userMessage: "I love practicing English with this tutor",
      })
      expect(result.memoryEvent).not.toBeNull()
      const state = agent.getState()
      expect(state.memory.events.length).toBeGreaterThanOrEqual(1)
    })

    it("accumulates state across multiple turns", () => {
      agent.processTurn({ signal: { type: "long_reply", intensity: 0.7 } })
      agent.processTurn({ signal: { type: "long_reply", intensity: 0.7 } })
      agent.processTurn({ signal: { type: "long_reply", intensity: 0.7 } })
      const state = agent.getState()
      expect(state.conversation.turnCount).toBe(3)
    })

    it("applies custom timeDeltaMinutes", () => {
      agent.processTurn({ signal: silenceSignal(), timeDeltaMinutes: 10 })
      const state = agent.getState()
      expect(state.conversation.sessionDurationMinutes).toBeGreaterThan(5)
    })
  })

  describe("needsIntervention", () => {
    it("returns false for fresh agent", () => {
      expect(agent.needsIntervention()).toBe(false)
    })

    it("returns true when engagement is critically low", () => {
      const customAgent = new PersonaAgent(baseConfig(), {
        initialRuntime: { engagement: 0.1 } as Partial<RuntimeState>,
      })
      expect(customAgent.needsIntervention()).toBe(true)
    })
  })

  describe("isEstablished", () => {
    it("returns false for fresh agent", () => {
      expect(agent.isEstablished()).toBe(false)
    })

    it("returns true with high relationship values", () => {
      const customAgent = new PersonaAgent(baseConfig(), {
        initialRelationship: { familiarity: 0.5, trust: 0.5, comfort: 0.5, humorAcceptance: 0.5 } as Partial<RelationshipState>,
      })
      expect(customAgent.isEstablished()).toBe(true)
    })
  })

  describe("getMemorySummary", () => {
    it("returns empty string when no memory events", () => {
      expect(agent.getMemorySummary()).toBe("")
    })

    it("returns summary after memory extraction", () => {
      agent.processTurn({
        signal: { type: "long_reply", intensity: 0.7 },
        userMessage: "I love learning new languages",
      })
      const summary = agent.getMemorySummary()
      expect(summary).toContain("Preferences")
    })
  })

  describe("reset", () => {
    it("resets all state to initial values", () => {
      agent.processTurn({ signal: { type: "positive_sentiment", intensity: 0.8 } })
      expect(agent.getState().conversation.turnCount).toBe(1)
      agent.reset()
      const state = agent.getState()
      expect(state.conversation.turnCount).toBe(0)
      expect(state.memory.events).toHaveLength(0)
      expect(state.runtime.energy).toBe(0.7)
    })

    it("preserves config after reset", () => {
      agent.reset()
      expect(agent.getState().config.name).toBe("test-tutor")
    })
  })

  describe("getState", () => {
    it("returns complete PersonaAgentState", () => {
      const state = agent.getState()
      expect(state).toHaveProperty("config")
      expect(state).toHaveProperty("runtime")
      expect(state).toHaveProperty("relationship")
      expect(state).toHaveProperty("conversation")
      expect(state).toHaveProperty("memory")
      expect(state).toHaveProperty("policy")
      expect(state).toHaveProperty("evaluators")
    })

    it("returns fresh copy of state each call", () => {
      const state1 = agent.getState()
      const state2 = agent.getState()
      expect(state1).not.toBe(state2)
    })
  })

  describe("tone consistency across turns", () => {
    it("produces deterministic tone for same state", () => {
      const input: ProcessTurnInput = { signal: { type: "long_reply", intensity: 0.7 } }
      const a = agent.processTurn(input)
      agent.reset()
      const b = agent.processTurn(input)
      expect(a.modulation.tone).toBe(b.modulation.tone)
    })

    it("shifts from default to playful with high valence and arousal", () => {
      const highEnergy = new PersonaAgent(baseConfig(), {
        initialRuntime: { emotional: { valence: 0.5, arousal: 0.7, dominance: 0.5 } },
      })
      const result = highEnergy.processTurn({ signal: { type: "long_reply", intensity: 0.5 } })
      expect(result.modulation.tone).toBe("playful")
    })

    it("shifts to supportive on low valence", () => {
      const lowMood = new PersonaAgent(baseConfig(), {
        initialRuntime: { emotional: { valence: -0.5, arousal: 0.5, dominance: 0.5 } },
      })
      const result = lowMood.processTurn({ signal: { type: "long_reply", intensity: 0.5 } })
      expect(result.modulation.tone).toBe("supportive")
    })

    it("maintains tone across consecutive turns with stable state", () => {
      const tones: string[] = []
      for (let i = 0; i < 3; i++) {
        const result = agent.processTurn({ signal: { type: "long_reply", intensity: 0.5 } })
        tones.push(result.modulation.tone)
      }
      expect(new Set(tones).size).toBe(1)
    })
  })

  describe("state drift behavior", () => {
    describe("engagement trajectory", () => {
      it("drops below intervention threshold with consecutive short replies", () => {
        for (let i = 0; i < 3; i++) {
          agent.processTurn({ signal: { type: "short_reply", intensity: 1 } })
        }
        const state = agent.getState()
        expect(state.conversation.turnCount).toBe(3)
        expect(state.conversation.consecutiveShortReplies).toBe(3)
        expect(state.runtime.engagement).toBe(0)
        expect(agent.needsIntervention()).toBe(true)
      })

      it("recovers engagement after long replies following short replies", () => {
        agent.processTurn({ signal: { type: "short_reply", intensity: 0.8 } })
        agent.processTurn({ signal: { type: "short_reply", intensity: 0.8 } })
        let state = agent.getState()
        expect(state.conversation.consecutiveShortReplies).toBe(2)
        const lowEngagement = state.runtime.engagement

        agent.processTurn({ signal: { type: "long_reply", intensity: 0.8 }, userMessage: "I have several things to say here today" })
        state = agent.getState()
        expect(state.conversation.consecutiveShortReplies).toBe(0)
        expect(state.runtime.engagement).toBeGreaterThan(lowEngagement)
      })

      it("boosts engagement on curiosity signal", () => {
        agent.processTurn({ signal: { type: "curiosity", intensity: 0.8 } })
        const state = agent.getState()
        expect(state.runtime.engagement).toBeGreaterThan(0.5)
      })
    })

    describe("valence trajectory", () => {
      it("drops below intervention threshold with sustained frustration", () => {
        for (let i = 0; i < 4; i++) {
          agent.processTurn({ signal: { type: "frustration", intensity: 1 } })
        }
        const state = agent.getState()
        expect(state.runtime.emotional.valence).toBeLessThan(-0.7)
        expect(agent.needsIntervention()).toBe(true)
      })

      it("recovers valence with positive sentiment after frustration", () => {
        agent.processTurn({ signal: { type: "frustration", intensity: 0.8 } })
        const afterFrustration = agent.getState().runtime.emotional.valence

        agent.processTurn({ signal: { type: "positive_sentiment", intensity: 0.8 } })
        const afterPositive = agent.getState().runtime.emotional.valence
        expect(afterPositive).toBeGreaterThan(afterFrustration)
      })

      it("accumulates correction_needed valence drop", () => {
        for (let i = 0; i < 3; i++) {
          agent.processTurn({ signal: { type: "correction_needed", intensity: 0.7 } })
        }
        const state = agent.getState()
        expect(state.runtime.emotional.valence).toBeLessThan(-0.3)
        const result = agent.processTurn({ signal: { type: "correction_needed", intensity: 0.7 } })
        expect(result.appliedRules).toContain("correction_needed_valence_drop")
      })
    })

    describe("trust trajectory", () => {
      it("grows with sustained positive sentiment", () => {
        for (let i = 0; i < 5; i++) {
          agent.processTurn({ signal: { type: "positive_sentiment", intensity: 0.8 } })
        }
        const state = agent.getState()
        expect(state.relationship.trust).toBeGreaterThan(0.3)
      })

      it("declines with sustained frustration", () => {
        for (let i = 0; i < 3; i++) {
          agent.processTurn({ signal: { type: "frustration", intensity: 0.8 } })
        }
        const state = agent.getState()
        expect(state.relationship.trust).toBeLessThan(0.1)
      })
    })

    describe("compound interactions", () => {
      it("triggers multiple mutation rules simultaneously at turn 12 with short replies", () => {
        for (let i = 0; i < 12; i++) {
          agent.processTurn({ signal: { type: "short_reply", intensity: 1 } })
        }
        const state = agent.getState()
        expect(state.conversation.turnCount).toBeGreaterThanOrEqual(12)
        expect(state.conversation.consecutiveShortReplies).toBeGreaterThanOrEqual(3)
        expect(state.runtime.engagement).toBe(0)
        expect(state.runtime.socialOpenness).toBeGreaterThanOrEqual(0.5)
        expect(agent.needsIntervention()).toBe(true)
      })
    })

    describe("relationship quality", () => {
      it("improves with diverse positive interactions", () => {
        agent.processTurn({ signal: { type: "positive_sentiment", intensity: 0.8 } })
        agent.processTurn({ signal: { type: "long_reply", intensity: 0.8 } })
        agent.processTurn({ signal: { type: "question", intensity: 0.8 } })
        agent.processTurn({ signal: { type: "curiosity", intensity: 0.8 } })
        agent.processTurn({ signal: { type: "openness", intensity: 0.8 } })
        const state = agent.getState()
        expect(state.relationship.familiarity).toBeGreaterThan(0.3)
        expect(state.relationship.trust).toBeGreaterThan(0.1)
        expect(state.relationship.comfort).toBeGreaterThan(0.1)
      })

      it("reaches established state with sufficient positive interaction", () => {
        for (let i = 0; i < 10; i++) {
          agent.processTurn({ signal: { type: "positive_sentiment", intensity: 0.8 } })
        }
        expect(agent.isEstablished()).toBe(true)
      })
    })

    describe("signal sequences", () => {
      it("alternating short and long replies resets consecutive short count", () => {
        const turns: Array<{ signal: ProcessTurnInput["signal"]; userMessage?: string }> = [
          { signal: { type: "short_reply", intensity: 0.8 } },
          { signal: { type: "short_reply", intensity: 0.8 } },
          { signal: { type: "long_reply", intensity: 0.8 }, userMessage: "I have several things to say here today" },
          { signal: { type: "short_reply", intensity: 0.8 } },
        ]
        for (const t of turns) {
          agent.processTurn(t)
        }
        const state = agent.getState()
        expect(state.conversation.consecutiveShortReplies).toBe(1)
      })

      it("silence reduces energy and engagement over time", () => {
        for (let i = 0; i < 5; i++) {
          agent.processTurn({ signal: { type: "silence", intensity: 0.8 } })
        }
        const state = agent.getState()
        expect(state.runtime.energy).toBeLessThan(0.7)
        expect(state.runtime.engagement).toBeLessThan(0.3)
      })
    })

    describe("decay effects", () => {
      it("energy decays over time even without negative signals", () => {
        agent.processTurn({ signal: { type: "long_reply", intensity: 0.5 }, timeDeltaMinutes: 30 })
        const state = agent.getState()
        expect(state.runtime.energy).toBeLessThan(0.5)
      })
    })
  })

  describe("pipeline integration (mutual modulation)", () => {
    it("returns intent and budget when userMessage is provided", () => {
      const result = agent.processTurn({ userMessage: "what does that mean", signal: { type: "long_reply", intensity: 0.5 } })
      expect(result.intent).toBeDefined()
      expect(result.budget).toBeDefined()
      expect(result.momentum).toBeDefined()
      expect(result.intent!.intent).toBe("ask_definition")
    })

    it("derives signal from intent when no explicit signal provided", () => {
      const result = agent.processTurn({ userMessage: "what does X mean" })
      expect(result.intent).toBeDefined()
      expect(result.intent!.intent).toBe("ask_definition")
    })

    it("tracks momentum across turns with userMessage", () => {
      agent.processTurn({ userMessage: "what does X mean" })
      const afterFirst = agent.getState()
      expect(afterFirst.momentum).toBeDefined()
      expect(afterFirst.momentum.depth).toBeGreaterThan(0)
      expect(afterFirst.momentum.momentum).toBeGreaterThan(0.5)

      agent.processTurn({ userMessage: "um" })
      const afterSecond = agent.getState()
      expect(afterSecond.momentum.momentum).toBeLessThan(afterFirst.momentum.momentum)
    })

    it("returns pipeline results in processTurn result", () => {
      const result = agent.processTurn({ userMessage: "hello" })
      expect(result.intent).toBeDefined()
      expect(result.budget).toBeDefined()
      expect(result.momentum).toBeDefined()
    })

    it("does not return pipeline results when only signal provided", () => {
      const result = agent.processTurn({ signal: { type: "silence", intensity: 0.5 } })
      expect(result.intent).toBeUndefined()
      expect(result.budget).toBeUndefined()
      expect(result.momentum).toBeUndefined()
    })

    it("accepts intentOverride to override heuristic classification", () => {
      const result = agent.processTurn({
        userMessage: "hello",
        intentOverride: { intent: "small_talk", confidence: 0.95 },
      })
      expect(result.intent!.intent).toBe("small_talk")
      expect(result.intent!.confidence).toBe(0.95)
    })

    it("pipeline results affect state: ask_definition boosts engagement via curiosity signal", () => {
      agent.processTurn({ userMessage: "what does asynchronous programming mean" })
      const state = agent.getState()
      expect(state.runtime.engagement).toBeGreaterThan(0.5)
    })

    it("pipeline results affect state: hesitation reduces dominance via hesitation signal", () => {
      agent.processTurn({ userMessage: "um well I'm not sure about that" })
      const state = agent.getState()
      expect(state.runtime.emotional.dominance).toBeLessThan(0.5)
    })
  })
})
