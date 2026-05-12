import type { Mode, Industry, Difficulty, Topic } from "@/types"
import type { AiAdapter } from "./adapter"

export class OpenAIAdapter implements AiAdapter {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY!
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

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
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
      ? (personaPrompt ?? `You are a friendly English conversation partner. Difficulty: ${difficulty}. ${topic ? `Topic: ${topic}.` : ""} Have a natural conversation. Be warm and engaging. Correct grammar mistakes subtly by modeling correct usage. If the user is silent, ask a follow-up question to keep the conversation going. Keep responses concise (2-4 sentences). shouldEnd is always false. Respond in JSON format: { "content": "your message", "shouldEnd": false }`)
      : `You are an English interviewer for a ${industry} position at ${difficulty} level. Conduct a natural conversational interview. Ask questions, follow up on answers, and give brief feedback naturally. Keep responses concise (2-4 sentences). When enough topics have been covered, set shouldEnd to true. Respond in JSON format: { "content": "your message", "shouldEnd": false }`

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversation.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
        ],
        response_format: { type: "json_object" },
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message ?? JSON.stringify(data))
    try {
      return JSON.parse(data.choices[0].message.content)
    } catch {
      return { content: data.choices[0].message.content, shouldEnd: false }
    }
  }

  async generateSummary(
    conversation: { role: "ai" | "user"; content: string }[],
    mode: Mode,
    difficulty: Difficulty,
    industry?: Industry,
    topic?: Topic
  ): Promise<{ overallScore: number; summary: string; strengths: string[]; improvements: string[] }> {
    const systemPrompt = mode === "conversation"
      ? `Summarize this English conversation (${difficulty} level)${topic ? ` about ${topic}` : ""}. Provide overallScore (0-100) based on fluency, vocabulary, grammar, and comprehension. Write a friendly summary paragraph, then list strengths and areas for improvement as arrays of strings. Respond in JSON format.`
      : `Summarize this ${industry} interview (${difficulty} level). Provide overallScore (0-100), a summary paragraph, strengths (array of strings), and improvements (array of strings). Respond in JSON format.`

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(conversation) },
        ],
        response_format: { type: "json_object" },
      }),
    })

    const data = await res.json()
    return JSON.parse(data.choices[0].message.content)
  }
}
