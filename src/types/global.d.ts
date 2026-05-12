import mongoose from "mongoose"
import type { InMemoryStore } from "@/lib/memstore"

declare global {
  var _mongoose: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
  }
  var __ai_english_memstore: InMemoryStore | undefined
  var __ai_english_persona_mem: Record<string, unknown> | undefined
  var __ai_english_telemetry: Record<string, unknown> | undefined

  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
