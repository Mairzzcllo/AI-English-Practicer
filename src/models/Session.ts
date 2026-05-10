import mongoose, { Schema, Document } from "mongoose"
import type { Mode, Industry, Difficulty, Topic, SessionStatus } from "@/types"

export interface IMessage {
  role: "ai" | "user"
  content: string
  createdAt: Date
}

export interface ISession extends Document {
  mode: Mode
  industry?: Industry
  topic?: Topic
  difficulty: Difficulty
  status: SessionStatus
  messages: IMessage[]
  startedAt: Date
  endedAt?: Date
  summary?: {
    overallScore: number
    summary: string
    strengths: string[]
    improvements: string[]
  }
  createdAt: Date
  updatedAt: Date
}

const messageSchema = new Schema<IMessage>({
  role: { type: String, enum: ["ai", "user"], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

const sessionSchema = new Schema<ISession>(
  {
    mode: { type: String, enum: ["interview", "conversation"], default: "interview" },
    industry: { type: String, enum: ["tech", "marketing", "management"] },
    topic: { type: String, enum: ["travel", "technology", "culture", "food", "sports", "music", "education", "career"] },
    difficulty: { type: String, enum: ["beginner", "intermediate", "advanced"], required: true },
    status: { type: String, enum: ["in_progress", "completed"], default: "in_progress" },
    messages: [messageSchema],
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    summary: {
      overallScore: Number,
      summary: String,
      strengths: [String],
      improvements: [String],
    },
  },
  { timestamps: true }
)

export const Session =
  mongoose.models.Session ?? mongoose.model<ISession>("Session", sessionSchema)
