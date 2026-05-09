# AGENTS.md — AI English Mock Interview

## Status

Phase 1-4 implemented. Nextjs 16 + MongoDB + AI Adapter scaffolding complete. Core interview flow works.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Voice | Web Speech API (browser STT/TTS, Chrome-targeted) |
| AI | Adapter pattern — OpenAI, DeepSeek (switched via `AI_PROVIDER` env) |
| Database | MongoDB + Mongoose |
| Deploy | Vercel |

## Commands

- `npm run dev` — dev server at localhost:3000
- `npm run build` — production build (run after every non-trivial change)
- `npm run lint` — ESLint (run before build)

Run order: `lint -> build`. Both must pass before committing.

## Project structure (src/)

```
src/
├── app/
│   ├── api/
│   │   ├── interview/start/route.ts   POST — create session, first question
│   │   ├── interview/answer/route.ts   POST — submit answer, get AI feedback
│   │   ├── interview/next-question/route.ts  POST — advance to next question
│   │   ├── interview/end/route.ts     POST — complete session, get summary
│   │   └── history/[id]/route.ts      GET — session detail
│   ├── interview/page.tsx             core interview UI (Suspense-wrapped)
│   ├── history/page.tsx               history list
│   └── history/[id]/page.tsx          history detail
├── lib/
│   ├── mongoose.ts                    cached MongoDB connection
│   └── ai/
│       ├── adapter.ts                 AiAdapter interface
│       ├── openai.ts                  OpenAI adapter
│       ├── deepseek.ts                DeepSeek adapter
│       └── index.ts                   factory (env AI_PROVIDER)
├── models/
│   └── Session.ts                     Mongoose schema (sessions + questions)
└── types/
    ├── index.ts                       shared types (Industry, Difficulty, Feedback, etc.)
    └── global.d.ts                    global mongoose cache type
```

## Architecture rules

- **ADR-001**: All AI calls through `AiAdapter` interface (`generateQuestion`, `generateFeedback`, `generateSummary`). Never hardcode a provider. Add new providers under `src/lib/ai/`.
- **ADR-002**: Web Speech API only. No paid speech services. Chrome is the target browser.
- API routes use `connectDB()` from `src/lib/mongoose.ts` (cached singleton — safe to call repeatedly).
- Interview limit: 5 questions per session (hardcoded in `next-question/route.ts`).

## Env vars

```
AI_PROVIDER=openai|deepseek
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
MONGODB_URI=mongodb://localhost:27017/ai-english-practice
```
