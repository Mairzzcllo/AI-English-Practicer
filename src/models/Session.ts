import mongoose, { Schema, Document } from "mongoose"
import type { Industry, Difficulty, SessionStatus } from "@/types"

export interface IQuestion {
  questionId: number
  question: string
  userAnswer: string
  feedback?: {
    grammar: string[]
    wordChoice: string[]
    pronunciationScore: number
    overallScore: number
    suggestion: string
  }
  duration: number
  createdAt: Date
}

export interface ISession extends Document {
  industry: Industry
  difficulty: Difficulty
  status: SessionStatus
  questions: IQuestion[]
  createdAt: Date
  updatedAt: Date
}

const questionSchema = new Schema<IQuestion>({
  questionId: { type: Number, required: true },
  question: { type: String, required: true },
  userAnswer: { type: String, default: "" },
  feedback: {
    grammar: [String],
    wordChoice: [String],
    pronunciationScore: Number,
    overallScore: Number,
    suggestion: String,
  },
  duration: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
})

const sessionSchema = new Schema<ISession>(
  {
    industry: {
      type: String,
      enum: ["tech", "marketing", "management"],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
    },
    questions: [questionSchema],
  },
  { timestamps: true }
)

export const Session =
  mongoose.models.Session ?? mongoose.model<ISession>("Session", sessionSchema)
