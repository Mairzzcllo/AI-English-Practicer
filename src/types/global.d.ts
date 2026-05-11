import mongoose from "mongoose"
import type { InMemoryStore } from "@/lib/memstore"

declare global {
  var _mongoose: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
  }
  var __ai_english_memstore: InMemoryStore | undefined

  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
