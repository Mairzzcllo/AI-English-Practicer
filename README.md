# AI English Mock Interview

Practice English interviews with AI feedback. Speak your answers, get grammar corrections, word choice improvements, and pronunciation scores in real time.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Voice | Web Speech API (browser STT/TTS, Chrome-recommended) |
| AI | Adapter pattern — OpenAI / DeepSeek |
| Database | MongoDB + Mongoose (in-memory fallback for dev) |
| Test | Vitest |

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB (optional — app falls back to in-memory storage)

### Setup

```bash
cp .env.local.example .env.local
```

Fill in your API keys in `.env.local`:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...               # or use DeepSeek
DEEPSEEK_API_KEY=sk-...
MONGODB_URI=mongodb://localhost:27017/ai-english-practice
```

### Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |

Run order: `lint → test → build`.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interview/start` | Create session, get first question |
| POST | `/api/interview/answer` | Submit answer, get AI feedback |
| POST | `/api/interview/next-question` | Advance to next question |
| POST | `/api/interview/end` | Complete session, get summary |
| GET | `/api/history` | List completed sessions |
| GET | `/api/history/[id]` | Get session detail |
| DELETE | `/api/history/[id]` | Delete a session |

## Architecture

```
Client (React) → API Routes → Store Layer → MongoDB / In-Memory
                                  ↓
                          AI Adapter → OpenAI / DeepSeek
```

All AI calls go through an `AiAdapter` interface. Switch providers via the `AI_PROVIDER` environment variable. Add new providers by implementing the interface in `src/lib/ai/`.

## Project Structure

```
src/
├── app/
│   ├── api/interview/       # Interview API routes
│   ├── api/history/         # History API routes
│   ├── interview/           # Interview UI
│   └── history/             # History UI
├── lib/
│   ├── ai/                  # AI adapters
│   ├── store.ts             # Unified data store
│   ├── memstore.ts          # In-memory dev fallback
│   └── mongoose.ts          # MongoDB connection
├── models/Session.ts        # Mongoose schema
└── types/                   # TypeScript types
```

## License

MIT
