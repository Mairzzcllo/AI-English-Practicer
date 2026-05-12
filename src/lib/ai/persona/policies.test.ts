import { describe, it, expect } from "vitest"
import type { BehavioralPolicy, RuntimeState, RelationshipState, ConversationState, ConversationSignal } from "./types"
import {
  getEffectiveVerbosity,
  shouldTakeInitiative,
  getHumorLevel,
  shouldInterruptSilence,
  getCorrectionUrgency,
  getMirrorIntensity,
  shouldPersistTopic,
  modulateResponse,
  computeTone,
  getEffectiveResponsePacing,
} from "./policies"

function basePolicy(overrides?: Partial<BehavioralPolicy>): BehavioralPolicy {
  return {
    correctionStyle: "gentle",
    initiativeLevel: 0.5,
    humorLevel: 0.5,
    verbosity: 0.5,
    responsePacing: "moderate",
    interruptTolerance: 0.5,
    emotionalMirroring: 0.5,
    topicPersistence: 0.5,
    tone: "warm",
    ...overrides,
  }
}

function baseRuntime(overrides?: Partial<RuntimeState>): RuntimeState {
  return {
    emotional: { valence: 0, arousal: 0.5, dominance: 0.5 },
    energy: 0.7,
    engagement: 0.5,
    socialOpenness: 0.5,
    ...overrides,
  }
}

function baseRelationship(overrides?: Partial<RelationshipState>): RelationshipState {
  return {
    familiarity: 0.5,
    trust: 0.5,
    comfort: 0.5,
    humorAcceptance: 0.5,
    ...overrides,
  }
}

function baseConv(overrides?: Partial<ConversationState>): ConversationState {
  return {
    turnCount: 0,
    lastUserMessageLength: 0,
    consecutiveShortReplies: 0,
    userTopicChanges: 0,
    sessionDurationMinutes: 0,
    ...overrides,
  }
}

describe("getEffectiveVerbosity", () => {
  it("returns base verbosity at neutral runtime and relationship", () => {
    expect(getEffectiveVerbosity(basePolicy(), baseRuntime(), baseRelationship())).toBeCloseTo(0.375, 2)
  })

  it("returns near-full verbosity when arousal and engagement are max with neutral relationship", () => {
    const runtime = baseRuntime({ emotional: { valence: 0.5, arousal: 1, dominance: 1 }, engagement: 1 })
    expect(getEffectiveVerbosity(basePolicy({ verbosity: 1 }), runtime, baseRelationship())).toBeCloseTo(0.925, 2)
  })

  it("returns reduced verbosity when verbosity is 0", () => {
    expect(getEffectiveVerbosity(basePolicy({ verbosity: 0 }), baseRuntime(), baseRelationship())).toBe(0)
  })

  it("increases verbosity with high trust and comfort", () => {
    const highRel = baseRelationship({ trust: 1, comfort: 1 })
    const lowRel = baseRelationship({ trust: 0, comfort: 0 })
    const high = getEffectiveVerbosity(basePolicy(), baseRuntime(), highRel)
    const low = getEffectiveVerbosity(basePolicy(), baseRuntime(), lowRel)
    expect(high).toBeGreaterThan(low)
  })
})

describe("shouldTakeInitiative", () => {
  it("returns false when initiativeLevel is 0", () => {
    expect(shouldTakeInitiative(basePolicy({ initiativeLevel: 0 }), baseConv())).toBe(false)
  })

  it("returns true on silence signal with session history", () => {
    const conv = baseConv({ sessionDurationMinutes: 1 })
    const signal: ConversationSignal = { type: "silence", intensity: 0.5 }
    expect(shouldTakeInitiative(basePolicy(), conv, signal)).toBe(true)
  })

  it("returns true with high consecutive short replies", () => {
    const conv = baseConv({ consecutiveShortReplies: 5 })
    expect(shouldTakeInitiative(basePolicy(), conv)).toBe(true)
  })

  it("returns false at early turn with moderate initiative", () => {
    const conv = baseConv({ turnCount: 2 })
    expect(shouldTakeInitiative(basePolicy({ initiativeLevel: 0.3 }), conv)).toBe(false)
  })

  it("increases initiative with high engagement and trust", () => {
    const conv = baseConv({ turnCount: 6 })
    const runtime = baseRuntime({ engagement: 0.9 })
    const rel = baseRelationship({ trust: 0.9 })
    expect(shouldTakeInitiative(basePolicy({ initiativeLevel: 0.3 }), conv, undefined, runtime, rel)).toBe(true)
  })
})

describe("getHumorLevel", () => {
  it("returns half of humorLevel at neutral valence and humorAcceptance", () => {
    expect(getHumorLevel(basePolicy({ humorLevel: 0.6 }), baseRuntime(), baseRelationship({ humorAcceptance: 0.5 }))).toBeCloseTo(0.225, 2)
  })

  it("returns full humorLevel at max valence and max humorAcceptance", () => {
    const runtime = baseRuntime({ emotional: { valence: 1, arousal: 0.5, dominance: 0.5 } })
    expect(getHumorLevel(basePolicy({ humorLevel: 0.8 }), runtime, baseRelationship({ humorAcceptance: 1 }))).toBeCloseTo(0.8, 2)
  })

  it("returns 0 at min valence", () => {
    const runtime = baseRuntime({ emotional: { valence: -1, arousal: 0.5, dominance: 0.5 } })
    expect(getHumorLevel(basePolicy({ humorLevel: 0.5 }), runtime, baseRelationship())).toBe(0)
  })

  it("increases humor with higher humorAcceptance", () => {
    const high = baseRelationship({ humorAcceptance: 1 })
    const low = baseRelationship({ humorAcceptance: 0 })
    const highHumor = getHumorLevel(basePolicy({ humorLevel: 0.6 }), baseRuntime(), high)
    const lowHumor = getHumorLevel(basePolicy({ humorLevel: 0.6 }), baseRuntime(), low)
    expect(highHumor).toBeGreaterThan(lowHumor)
  })
})

describe("shouldInterruptSilence", () => {
  it("returns false when silence is short", () => {
    expect(shouldInterruptSilence(basePolicy(), baseRuntime(), 500, baseRelationship())).toBe(false)
  })

  it("returns true when silence exceeds effective delay", () => {
    expect(shouldInterruptSilence(basePolicy({ responsePacing: "fast", interruptTolerance: 0 }), baseRuntime(), 2000, baseRelationship())).toBe(true)
  })

  it("requires longer silence with slow pacing", () => {
    expect(shouldInterruptSilence(basePolicy({ responsePacing: "slow" }), baseRuntime(), 2000, baseRelationship())).toBe(false)
    expect(shouldInterruptSilence(basePolicy({ responsePacing: "slow" }), baseRuntime(), 7000, baseRelationship())).toBe(true)
  })

  it("adapts to fast pacing with high engagement and arousal", () => {
    const runtime = baseRuntime({ engagement: 0.9, emotional: { valence: 0.3, arousal: 0.9, dominance: 0.5 } })
    const result = shouldInterruptSilence(basePolicy({ responsePacing: "moderate" }), runtime, 1500, baseRelationship())
    expect(result).toBe(true)
  })

  it("adapts to slow pacing with low energy", () => {
    const runtime = baseRuntime({ energy: 0.1 })
    expect(shouldInterruptSilence(basePolicy({ responsePacing: "fast" }), runtime, 500, baseRelationship())).toBe(false)
  })
})

describe("getEffectiveResponsePacing", () => {
  it("returns fast pacing with high engagement and arousal", () => {
    const runtime = baseRuntime({ engagement: 0.9, emotional: { valence: 0.3, arousal: 0.9, dominance: 0.5 } })
    expect(getEffectiveResponsePacing(basePolicy(), runtime, baseRelationship())).toBe("fast")
  })

  it("returns slow pacing with low energy", () => {
    const runtime = baseRuntime({ energy: 0.1 })
    expect(getEffectiveResponsePacing(basePolicy(), runtime, baseRelationship())).toBe("slow")
  })

  it("returns slow pacing with low familiarity", () => {
    const rel = baseRelationship({ familiarity: 0.1 })
    expect(getEffectiveResponsePacing(basePolicy(), baseRuntime(), rel)).toBe("slow")
  })

  it("falls back to policy pacing at neutral state", () => {
    expect(getEffectiveResponsePacing(basePolicy(), baseRuntime(), baseRelationship())).toBe("moderate")
  })
})

describe("getCorrectionUrgency", () => {
  it("returns base urgency for gentle style", () => {
    expect(getCorrectionUrgency(basePolicy({ correctionStyle: "gentle" }))).toBe(0.3)
  })

  it("returns higher urgency for direct style", () => {
    expect(getCorrectionUrgency(basePolicy({ correctionStyle: "direct" }))).toBe(0.8)
  })

  it("returns 0 for none style", () => {
    expect(getCorrectionUrgency(basePolicy({ correctionStyle: "none" }))).toBe(0)
  })

  it("increases urgency on correction_needed signal", () => {
    const signal: ConversationSignal = { type: "correction_needed", intensity: 0.5 }
    expect(getCorrectionUrgency(basePolicy({ correctionStyle: "gentle" }), signal)).toBeCloseTo(0.6, 2)
  })
})

describe("getMirrorIntensity", () => {
  it("returns emotionalMirroring value", () => {
    expect(getMirrorIntensity(basePolicy({ emotionalMirroring: 0.8 }))).toBe(0.8)
  })
})

describe("shouldPersistTopic", () => {
  it("returns true when topicPersistence is high", () => {
    expect(shouldPersistTopic(basePolicy({ topicPersistence: 0.9 }), baseConv())).toBe(true)
  })

  it("returns false after many user topic changes", () => {
    const conv = baseConv({ userTopicChanges: 4 })
    expect(shouldPersistTopic(basePolicy({ topicPersistence: 0.7 }), conv)).toBe(false)
  })

  it("returns false with short replies at moderate persistence", () => {
    const conv = baseConv({ consecutiveShortReplies: 3 })
    expect(shouldPersistTopic(basePolicy({ topicPersistence: 0.6 }), conv)).toBe(false)
  })
})

describe("computeTone", () => {
  it("returns base policy tone at neutral state", () => {
    const tone = computeTone(basePolicy({ tone: "neutral" }), baseRuntime(), baseRelationship())
    expect(tone).toBe("neutral")
  })

  it("returns playful at high valence and high arousal", () => {
    const runtime = baseRuntime({ emotional: { valence: 0.6, arousal: 0.8, dominance: 0.5 } })
    const tone = computeTone(basePolicy(), runtime, baseRelationship())
    expect(tone).toBe("playful")
  })

  it("returns supportive at low valence", () => {
    const runtime = baseRuntime({ emotional: { valence: -0.5, arousal: 0.5, dominance: 0.5 } })
    const tone = computeTone(basePolicy(), runtime, baseRelationship())
    expect(tone).toBe("supportive")
  })

  it("returns neutral at low trust", () => {
    const rel = baseRelationship({ trust: 0.1, comfort: 0.1 })
    const tone = computeTone(basePolicy(), baseRuntime(), rel)
    expect(tone).toBe("neutral")
  })

  it("returns formal at low familiarity", () => {
    const rel = baseRelationship({ familiarity: 0.1 })
    const tone = computeTone(basePolicy(), baseRuntime(), rel)
    expect(tone).toBe("formal")
  })

  it("returns warm at high familiarity and high comfort", () => {
    const rel = baseRelationship({ familiarity: 0.7, comfort: 0.7 })
    const tone = computeTone(basePolicy({ tone: "warm" }), baseRuntime(), rel)
    expect(tone).toBe("warm")
  })

  it("defaults to warm when no conditions strongly match", () => {
    const runtime = baseRuntime({ emotional: { valence: 0, arousal: 0.4, dominance: 0.5 } })
    const rel = baseRelationship({ familiarity: 0.4, trust: 0.4, comfort: 0.4 })
    const tone = computeTone(basePolicy(), runtime, rel)
    expect(tone).toBe("warm")
  })
})

describe("modulateResponse", () => {
  it("returns complete modulation output", () => {
    const signal: ConversationSignal = { type: "question", intensity: 0.8 }
    const output = modulateResponse(basePolicy(), signal, baseRuntime(), baseConv(), baseRelationship())
    expect(output).toHaveProperty("verbosity")
    expect(output).toHaveProperty("initiative")
    expect(output).toHaveProperty("humor")
    expect(output).toHaveProperty("shouldInterrupt")
    expect(output).toHaveProperty("correctionUrgency")
    expect(output).toHaveProperty("emotionalMirroring")
    expect(output).toHaveProperty("topicPersistence")
    expect(output).toHaveProperty("tone")
  })

  it("sets shouldInterrupt true on silence signal with initiative", () => {
    const signal: ConversationSignal = { type: "silence", intensity: 0.5 }
    const conv = baseConv({ sessionDurationMinutes: 2 })
    const output = modulateResponse(basePolicy({ initiativeLevel: 0.6 }), signal, baseRuntime(), conv, baseRelationship())
    expect(output.shouldInterrupt).toBe(true)
    expect(output.initiative).toBe(0.6)
  })

  it("produces deterministic output for same inputs", () => {
    const signal: ConversationSignal = { type: "short_reply", intensity: 0.5 }
    const a = modulateResponse(basePolicy(), signal, baseRuntime(), baseConv(), baseRelationship())
    const b = modulateResponse(basePolicy(), signal, baseRuntime(), baseConv(), baseRelationship())
    expect(a).toEqual(b)
  })

  it("increases verbosity and humor with high relationship quality", () => {
    const signal: ConversationSignal = { type: "long_reply", intensity: 0.5 }
    const highRel = baseRelationship({ trust: 1, comfort: 1, humorAcceptance: 1 })
    const lowRel = baseRelationship({ trust: 0, comfort: 0, humorAcceptance: 0 })
    const high = modulateResponse(basePolicy(), signal, baseRuntime(), baseConv(), highRel)
    const low = modulateResponse(basePolicy(), signal, baseRuntime(), baseConv(), lowRel)
    expect(high.verbosity).toBeGreaterThan(low.verbosity)
    expect(high.humor).toBeGreaterThan(low.humor)
  })
})
