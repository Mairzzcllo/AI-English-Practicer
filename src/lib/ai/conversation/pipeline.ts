import type { PersonaPromptInput } from "../persona/prompts"
import type { IntentResult, ResponseBudget, PersonaModulationInput, AmbiguityAssessment, MomentumState } from "./types"
import { classifyIntent } from "./intent"
import { deriveBudget } from "./budget"
import { enforceMinimalism } from "./minimalism"
import { assessAmbiguity, getCarryOnHint } from "./ambiguity"
import { buildSystemPrompt, buildUserTurnPrompt } from "../persona/prompts"
import { createDefaultMomentumState, updateMomentumFromIntent, momentumToBudgetMultiplier, momentumToPrompt } from "./momentum"

export interface PipelineInput {
  userMessage: string
  personaInput: PersonaPromptInput
  modulation?: PersonaModulationInput
  momentum?: MomentumState
  intentOverride?: IntentResult
}

export interface PipelineResult {
  intent: IntentResult
  budget: ResponseBudget
  ambiguity: AmbiguityAssessment
  momentum: MomentumState
  systemPrompt: string
  userTurnPrompt: string
}

export function runPipeline(input: PipelineInput): PipelineResult {
  const intent = input.intentOverride ?? classifyIntent(input.userMessage)

  const currentMomentum = input.momentum ?? createDefaultMomentumState()
  const updatedMomentum = updateMomentumFromIntent(currentMomentum, intent, input.userMessage)

  const derived = deriveBudget(intent, input.userMessage, input.modulation)
  let budget = enforceMinimalism(intent, derived, input.userMessage)

  const multiplier = momentumToBudgetMultiplier(updatedMomentum)
  budget = {
    maxSentences: Math.round(Math.min(10, budget.maxSentences * multiplier)),
    explanationDepth: budget.explanationDepth,
  }

  const ambiguity = assessAmbiguity(intent, input.userMessage)

  const carryOnHint = getCarryOnHint(ambiguity)
  const momentumHint = momentumToPrompt(updatedMomentum)

  const promptInput: PersonaPromptInput = {
    ...input.personaInput,
    budget,
    momentum: updatedMomentum,
  }

  let systemPrompt = buildSystemPrompt(promptInput)
  const userTurnPrompt = buildUserTurnPrompt(promptInput, input.userMessage)

  if (carryOnHint) {
    systemPrompt += `\n${carryOnHint}`
  }
  if (momentumHint) {
    systemPrompt += `\n${momentumHint}`
  }

  return { intent, budget, ambiguity, momentum: updatedMomentum, systemPrompt, userTurnPrompt }
}
