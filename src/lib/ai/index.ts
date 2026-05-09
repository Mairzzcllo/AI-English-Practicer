import type { AiAdapter } from "./adapter"
import { OpenAIAdapter } from "./openai"
import { DeepSeekAdapter } from "./deepseek"

export function createAiAdapter(): AiAdapter {
  const provider = process.env.AI_PROVIDER ?? "openai"

  switch (provider) {
    case "openai":
      return new OpenAIAdapter()
    case "deepseek":
      return new DeepSeekAdapter()
    default:
      throw new Error(`Unknown AI provider: ${provider}`)
  }
}
