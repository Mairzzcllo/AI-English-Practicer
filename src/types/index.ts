export interface QuestionFeedback {
  grammar: string[]
  wordChoice: string[]
  pronunciationScore: number
  overallScore: number
  suggestion: string
}

export interface Question {
  questionId: number
  question: string
  userAnswer: string
  feedback?: QuestionFeedback
  duration: number
  createdAt: Date
}

export type Industry = "tech" | "marketing" | "management"
export type Difficulty = "beginner" | "intermediate" | "advanced"
export type SessionStatus = "in_progress" | "completed"

export interface InterviewSession {
  _id: string
  industry: Industry
  difficulty: Difficulty
  status: SessionStatus
  questions: Question[]
  createdAt: Date
  updatedAt: Date
}
