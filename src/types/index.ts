export type Mode = "interview" | "conversation"
export type Industry = "tech" | "marketing" | "management"
export type Topic = "travel" | "technology" | "culture" | "food" | "sports" | "music" | "education" | "career"
export type Difficulty = "beginner" | "intermediate" | "advanced"
export type SessionStatus = "in_progress" | "completed"

export interface Message {
  role: "ai" | "user"
  content: string
  createdAt: Date
}

export interface InterviewSession {
  _id: string
  mode: Mode
  industry?: Industry
  topic?: Topic
  difficulty: Difficulty
  status: SessionStatus
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  endedAt?: Date
  summary?: {
    overallScore: number
    summary: string
    strengths: string[]
    improvements: string[]
  }
}
