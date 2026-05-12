<p align="center">
  <h1 align="center">TalkEasy AI</h1>
  <p align="center">Practice English interviews and conversations with an AI tutor.</p>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#usage">Usage</a> •
  <a href="#api">API</a> •
  <a href="#configuration">Configuration</a>
</p>

---

TalkEasy AI lets you practice English speaking in realistic interview scenarios or casual conversations. Speak naturally, get instant AI responses, and receive detailed feedback on your performance.

## Features

- **Interview mode** — Choose your industry (tech, marketing, management) and difficulty level for structured mock interviews
- **Conversation mode** — Casual, user-led conversation on topics like travel, technology, culture, and more with AI-initiated turn-taking on silence
- **Cognitive Persona Engine** — Stateful AI persona with emotional state, relationship tracking, episodic memory, and behavioral policies that adapt across turns
- **Voice in, voice out** — Browser-based speech recognition and synthesis (Chrome recommended)
- **Real-time feedback** — Get an overall score with specific strengths and areas to improve after each session
- **Session history** — Review past conversations with full transcripts and scores
- **15-minute sessions** — Timed practice with automatic silence detection

## Quick Start

```bash
npm install
cp .env.local.example .env.local
```

Add your API keys to `.env.local`:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

Select your mode (interview or conversation), industry/topic, and difficulty on the start screen. Speak your answers — the AI responds in real time. After 15 minutes or when you end, receive a summary with score, strengths, and improvement suggestions.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interview/start` | Create a session and get the opening question |
| POST | `/api/interview/talk` | Submit a response and get AI reply (persona-enhanced in conversation mode) |
| POST | `/api/interview/end` | End the session and get a summary with score |
| GET | `/api/history` | List all completed sessions |
| GET | `/api/history/[id]` | Get a session's full detail |
| DELETE | `/api/history/[id]` | Delete a session |
| GET | `/api/telemetry` | Get persona engine telemetry (summary or detail) |
| DELETE | `/api/telemetry` | Reset persona engine telemetry |

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_PROVIDER` | Yes | `openai` or `deepseek` |
| `OPENAI_API_KEY` | For OpenAI | Your OpenAI API key |
| `DEEPSEEK_API_KEY` | For DeepSeek | Your DeepSeek API key |
| `MONGODB_URI` | No | MongoDB connection string (falls back to in-memory) |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Voice | Web Speech API |
| AI | Adapter pattern — OpenAI / DeepSeek |
| Cognitive Engine | PersonaAgent (emotional state, relationship, memory, policies, mutation rules) |
| Database | MongoDB + Mongoose (in-memory fallback) |
| Test | Vitest + Testing Library (431 tests) |

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── interview/start/    POST — create session, opening question
│   │   ├── interview/talk/     POST — conversation turn (persona-enhanced)
│   │   ├── interview/end/      POST — end session, AI summary
│   │   ├── history/[id]/       GET/DELETE — session detail
│   │   └── telemetry/          GET/DELETE — persona engine telemetry
│   ├── interview/              Orchestration layer (3 screens)
│   └── history/                History list + detail pages
├── components/ui/              16 shared UI components
├── hooks/                      8 custom hooks (STT, TTS, silence, etc.)
├── lib/
│   ├── ai/
│   │   ├── adapter.ts          AiAdapter interface
│   │   ├── openai.ts           OpenAI adapter
│   │   ├── deepseek.ts         DeepSeek adapter
│   │   ├── index.ts            Factory (env AI_PROVIDER)
│   │   └── persona/            Cognitive Runtime Engine
│   │       ├── types.ts        Persona, state, relationship types
│   │       ├── state.ts        EmotionalState, RuntimeState, ConversationState
│   │       ├── relationship.ts Familiarity, trust, comfort tracking
│   │       ├── memory.ts       Episodic compression + retrieval
│   │       ├── policies.ts     Behavioral modulation (verbosity, humor, etc.)
│   │       ├── mutation.ts     State mutation rules engine
│   │       ├── orchestrator.ts Cognitive pipeline coordinator
│   │       ├── persona.ts      PersonaAgent facade
│   │       ├── prompts.ts      Dynamic persona prompt assembly
│   │       ├── store.ts        Persistent store (MongoDB + in-memory fallback + caching)
│   │       └── telemetry.ts    Pipeline latency, mutation fires, state diffs
│   ├── store.ts                Unified data store (MongoDB → in-memory fallback)
│   └── mongoose.ts             Cached MongoDB connection
├── models/
│   ├── Session.ts              Mongoose session schema
│   └── PersonaState.ts         Mongoose persona state schema (30-day TTL)
└── types/                      TypeScript types
```

## License

MIT
