import type { Industry, Difficulty, QuestionFeedback } from "@/types"
import type { AiAdapter } from "./adapter"

export class OpenAIAdapter implements AiAdapter {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY!
  }

  async generateQuestion(
    industry: Industry,
    difficulty: Difficulty,
    previousQuestions: string[]
  ): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an English interviewer for a ${industry} position. Difficulty: ${difficulty}. Ask one interview question at a time. Previous questions: ${previousQuestions.join(", ")}`,
          },
          { role: "user", content: "Ask me the next interview question." },
        ],
      }),
    })

    const data = await res.json()
    return data.choices[0].message.content
  }

  async generateFeedback(
    question: string,
    userAnswer: string
  ): Promise<QuestionFeedback> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an English tutor. Analyze the user's answer to an interview question. Provide grammar corrections, word choice improvements, a pronunciation score (0-100), overall score (0-100), and a brief improvement suggestion. Respond in JSON format.`,
          },
          {
            role: "user",
            content: JSON.stringify({ question, userAnswer }),
          },
        ],
        response_format: { type: "json_object" },
      }),
    })

    const data = await res.json()
    return JSON.parse(data.choices[0].message.content)
  }

  async generateSummary(
    questions: { question: string; userAnswer: string; feedback?: QuestionFeedback }[]
  ): Promise<{ overallScore: number; summary: string }> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Summarize the interview performance. Provide an overall score (0-100) and a brief summary. Respond in JSON format.`,
          },
          {
            role: "user",
            content: JSON.stringify(questions),
          },
        ],
        response_format: { type: "json_object" },
      }),
    })

    const data = await res.json()
    return JSON.parse(data.choices[0].message.content)
  }
}
