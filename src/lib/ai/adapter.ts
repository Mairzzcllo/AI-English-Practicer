import type { Industry, Difficulty, QuestionFeedback } from "@/types"

export interface AiAdapter {
  generateQuestion(
    industry: Industry,
    difficulty: Difficulty,
    previousQuestions: string[]
  ): Promise<string>

  generateFeedback(
    question: string,
    userAnswer: string
  ): Promise<QuestionFeedback>

  generateSummary(
    questions: { question: string; userAnswer: string; feedback?: QuestionFeedback }[]
  ): Promise<{ overallScore: number; summary: string }>
}
