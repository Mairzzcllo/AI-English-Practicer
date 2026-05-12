import type { Mode, Industry, Difficulty, Topic } from "@/types"
import type { AiAdapter } from "./adapter"

export class DeepSeekAdapter implements AiAdapter {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY!
  }

  async generateOpeningQuestion(
    mode: Mode,
    difficulty: Difficulty,
    industry?: Industry,
    topic?: Topic
  ): Promise<string> {
    const systemPrompt = mode === "conversation"
      ? `You are an English conversation partner. Difficulty: ${difficulty}. ${topic ? `Topic: ${topic}.` : ""} Start a natural, friendly conversation. Ask an open-ended question to get the user talking. Keep it warm and engaging.`
      : `You are an English interviewer for a ${industry} position. Difficulty: ${difficulty}. Start the interview with an opening question.`

    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Start." },
        ],
      }),
    })

    const data = await res.json()
    return data.choices[0].message.content
  }

  async generateConversationResponse(
    conversation: { role: "ai" | "user"; content: string }[],
    mode: Mode,
    difficulty: Difficulty,
    industry?: Industry,
    topic?: Topic,
    personaPrompt?: string
  ): Promise<{ content: string; shouldEnd: boolean }> {
    const systemPrompt = mode === "conversation"
      ? (personaPrompt ?? `You are a friendly English conversation partner. Difficulty: ${difficulty}. ${topic ? `Topic: ${topic}.` : ""} Have a natural conversation. Be warm and engaging. Correct grammar mistakes subtly by modeling correct usage. If the user is silent, ask a follow-up question to keep the conversation going. Keep responses concise (2-4 sentences). shouldEnd is always false. You MUST begin your response with a JSON object: {"content": "your message", "shouldEnd": false} then immediately start your message. For example: {"content": "That's interesting! What made you travel there?", "shouldEnd": false} That's interesting! What made you travel there?`)
      : `You are an English interviewer for a ${industry} position at ${difficulty} level. Conduct a natural conversational interview. Ask questions, follow up on answers, and give brief feedback naturally. Keep responses concise (2-4 sentences). When enough topics have been covered, set shouldEnd to true. You MUST begin your response with a JSON object: {"content": "your message", "shouldEnd": false} then immediately start your message. For example: {"content": "Tell me more about your experience.", "shouldEnd": false} Tell me more about your experience.`

    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversation.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
        ],
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message ?? JSON.stringify(data))

    const raw = data.choices[0].message.content
    const braceIdx = raw.indexOf("{")
    if (braceIdx >= 0) {
      try {
        const parsed = JSON.parse(raw.slice(braceIdx, raw.lastIndexOf("}") + 1))
        return { content: parsed.content ?? raw, shouldEnd: parsed.shouldEnd ?? false }
      } catch {}
    }
    return { content: raw, shouldEnd: false }
  }

  async generateSummary(
    conversation: { role: "ai" | "user"; content: string }[],
    mode: Mode,
    difficulty: Difficulty,
    industry?: Industry,
    topic?: Topic
  ): Promise<{ overallScore: number; summary: string; strengths: string[]; improvements: string[] }> {
    const systemPrompt = mode === "conversation"
      ? `Summarize this English conversation (${difficulty} level)${topic ? ` about ${topic}` : ""}. Provide overallScore (0-100) based on fluency, vocabulary, grammar, and comprehension. Write a friendly summary paragraph, then list strengths and areas for improvement as arrays of strings. Respond in JSON format like: {"overallScore": 75, "summary": "...", "strengths": [...], "improvements": [...]}`
      : `Summarize this ${industry} interview (${difficulty} level). Provide overallScore (0-100), a summary paragraph, strengths (array of strings), and improvements (array of strings). Respond in JSON format like: {"overallScore": 75, "summary": "...", "strengths": [...], "improvements": [...]}`

    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(conversation) },
        ],
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message ?? JSON.stringify(data))
    const raw = data.choices[0].message.content
    const braceIdx = raw.indexOf("{")
    if (braceIdx >= 0) {
      try {
        return JSON.parse(raw.slice(braceIdx, raw.lastIndexOf("}") + 1))
      } catch {}
    }
    return { overallScore: 0, summary: raw, strengths: [], improvements: [] }
  }
}
