# AGENTS.md — TalkEasy AI

## Status

Phase 7 complete: Free Talk mode. Mode selector + topic picker. AI adapter supports both interview and conversation prompts. Layout fixed (End button always visible). Rebranded to TalkEasy AI.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Voice | Web Speech API (browser STT/TTS, Chrome-targeted) |
| AI | Adapter pattern — OpenAI, DeepSeek (switched via `AI_PROVIDER` env) |
| Database | MongoDB + Mongoose (auto-fallback to in-memory for dev) |
| Deploy | Vercel |

## Commands

- `npm run dev` — dev server at localhost:3000
- `npm run build` — production build (run after every non-trivial change)
- `npm run lint` — ESLint (run before build)
- `npm test` — vitest (unit tests)
- `npm run test:watch` — vitest in watch mode

Run order: `lint -> test -> build`. All must pass before committing.

## Project structure (src/)

```
src/
├── app/
│   ├── api/
│   │   ├── interview/start/route.ts    POST — create session, opening question (accepts mode + topic)
│   │   ├── interview/talk/route.ts     POST — conversation turn (passes session.mode/topic/industry)
│   │   ├── interview/end/route.ts      POST — complete session, get AI summary
│   │   └── history/[id]/route.ts       GET — session detail, DELETE — delete session
│   ├── interview/page.tsx              continuous conversation UI (mode-aware titles + badges)
│   ├── history/page.tsx                history list with mode badge + score + delete
│   └── history/[id]/page.tsx           history detail with mode/topic/industry info
├── lib/
│   ├── mongoose.ts                     cached MongoDB connection
│   ├── store.ts                        unified store (MongoDB → in-memory fallback)
│   ├── memstore.ts                     in-memory store via globalThis (HMR-safe)
│   └── ai/
│       ├── adapter.ts                  AiAdapter interface (mode + topic + industry params)
│       ├── openai.ts                   OpenAI adapter (mode-aware prompts)
│       ├── deepseek.ts                 DeepSeek adapter (JSON extraction fallback, mode-aware)
│       └── index.ts                    factory (env AI_PROVIDER)
├── models/
│   └── Session.ts                      Mongoose schema (mode + topic + messages)
└── types/
    ├── index.ts                        shared types (Mode, Industry, Difficulty, Topic, Message, etc.)
    └── global.d.ts                     global mongoose + memstore type cache
```

## Architecture rules

- **ADR-001**: All AI calls through `AiAdapter` interface (`generateOpeningQuestion`, `generateConversationResponse`, `generateSummary`). Methods accept `mode` + `topic` + `industry`. Never hardcode a provider.
- **ADR-002**: Web Speech API only. No paid speech services. Chrome is the target browser.
- **ADR-003**: Design system via Tailwind v4 `@utility` + CSS variables. `glass` / `glass-hover` for glassmorphism cards. Brand gradient `from-indigo-500 to-purple-600`. Defined in `globals.css:root`.
- **ADR-004**: Mode system — `Mode = "interview" | "conversation"`. Conversation mode: user-led, AI initiates on 2.5s silence, `shouldEnd` always false. Separate AI prompts per mode.
- API routes use `connectDB()` from `src/lib/mongoose.ts` (cached singleton — safe to call repeatedly).
- **Store layer** (`src/lib/store.ts`): auto-detects MongoDB; falls back to in-memory if unavailable.
- **Memstore** (`src/lib/memstore.ts`): uses `globalThis` for HMR-safe persistence.
- Session: 15-minute timer. Continuous recording with 2.5s silence auto-submit via `/talk` API.
- DeepSeek adapter uses JSON extraction (find `{...}` in response) instead of `response_format`.
- `role` mapping: `"ai"` → `"assistant"` when sending to AI providers.
- `createSession` takes a params object `{ mode, industry?, topic?, difficulty, firstMessage }`.

## Env vars

```
AI_PROVIDER=openai|deepseek
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
MONGODB_URI=mongodb://localhost:27017/ai-english-practice
```
