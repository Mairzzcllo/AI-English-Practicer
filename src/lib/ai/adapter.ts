import type { Mode, Industry, Difficulty, Topic } from "@/types"

export interface AiAdapter {
  generateOpeningQuestion(
    mode: Mode,
    difficulty: Difficulty,
    industry?: Industry,
    topic?: Topic
  ): Promise<string>

  generateConversationResponse(
    conversation: { role: "ai" | "user"; content: string }[],
    mode: Mode,
    difficulty: Difficulty,
    industry?: Industry,
    topic?: Topic,
    personaPrompt?: string
  ): Promise<{ content: string; shouldEnd: boolean }>

  generateSummary(
    conversation: { role: "ai" | "user"; content: string }[],
    mode: Mode,
    difficulty: Difficulty,
    industry?: Industry,
    topic?: Topic
  ): Promise<{
    overallScore: number
    summary: string
    strengths: string[]
    improvements: string[]
  }>
}
