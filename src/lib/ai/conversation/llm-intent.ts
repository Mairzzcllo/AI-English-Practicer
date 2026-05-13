import type { IntentResult, UserIntent } from "./types"

const ALL_INTENTS: UserIntent[] = [
  "continue_conversation",
  "ask_definition",
  "ask_correction",
  "small_talk",
  "hesitation",
  "confirmation",
  "emotional_expression",
]

const VALID_INTENTS = new Set<string>(ALL_INTENTS)

const INTENT_DESCRIPTIONS = `
- continue_conversation: user wants to continue the conversation, asks "tell me more", "go on", "please continue"
- ask_definition: user asks for a definition or explanation of a term or concept
- ask_correction: user asks if their grammar or word usage is correct
- small_talk: user makes casual conversation, greetings, pleasantries
- hesitation: user is unsure, uses fillers like "um", "uh", "well", trailing ellipsis
- confirmation: user confirms understanding with "okay", "yes", "I see", "got it", "right", "sure"
- emotional_expression: user expresses emotions, feelings, or strong reactions
`

const LLM_THRESHOLD = 0.4

const SYSTEM_PROMPT = `You are an intent classifier for an English learning conversation system. Classify the user's message into EXACTLY ONE intent from the list below. Respond with ONLY a JSON object in this exact format: {"intent": "intent_name", "confidence": 0.95}

Intents:${INTENT_DESCRIPTIONS}

Rules:
- confidence must be between 0 and 1
- Pick the single best matching intent
- If truly ambiguous, pick the most likely intent with lower confidence`

function buildRequestBody(input: string, model: string, provider: string) {
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: input },
  ]

  const body: Record<string, unknown> = { model, messages }

  if (provider === "openai") {
    body.response_format = { type: "json_object" }
  }

  return body
}

function parseJSONResponse(raw: string): Partial<IntentResult> | null {
  const braceIdx = raw.indexOf("{")
  if (braceIdx < 0) return null
  try {
    return JSON.parse(raw.slice(braceIdx, raw.lastIndexOf("}") + 1))
  } catch {
    return null
  }
}

function sanitizeResult(parsed: Partial<IntentResult>): IntentResult {
  const intent = parsed?.intent
  const confidence = parsed?.confidence

  if (typeof intent !== "string" || !VALID_INTENTS.has(intent)) {
    return { intent: "continue_conversation", confidence: 0.3 }
  }

  const clamped = typeof confidence === "number" ? Math.max(0, Math.min(1, confidence)) : 0.5

  return { intent: intent as UserIntent, confidence: clamped }
}

export function getLLMFallbackThreshold(): number {
  return LLM_THRESHOLD
}

export async function classifyIntentWithLLM(
  input: string,
  fetchFn: typeof globalThis.fetch = globalThis.fetch,
): Promise<IntentResult> {
  const trimmed = input.trim()
  if (!trimmed) {
    return { intent: "continue_conversation", confidence: 0.3 }
  }

  const provider = process.env.AI_PROVIDER ?? "openai"

  const configs: Record<string, { apiKeyEnv: string; url: string; model: string }> = {
    openai: { apiKeyEnv: "OPENAI_API_KEY", url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o" },
    deepseek: { apiKeyEnv: "DEEPSEEK_API_KEY", url: "https://api.deepseek.com/v1/chat/completions", model: "deepseek-chat" },
  }

  const cfg = configs[provider]
  if (!cfg) return { intent: "continue_conversation", confidence: 0.3 }

  const apiKey = process.env[cfg.apiKeyEnv]
  if (!apiKey) return { intent: "continue_conversation", confidence: 0.3 }

  try {
    const res = await fetchFn(cfg.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildRequestBody(trimmed, cfg.model, provider)),
    })

    if (!res.ok) {
      return { intent: "continue_conversation", confidence: 0.3 }
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    const raw = data.choices?.[0]?.message?.content ?? ""
    const parsed = parseJSONResponse(raw)
    return sanitizeResult(parsed ?? {})
  } catch {
    return { intent: "continue_conversation", confidence: 0.3 }
  }
}

export { LLM_THRESHOLD }
