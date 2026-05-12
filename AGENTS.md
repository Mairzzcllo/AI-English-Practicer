# AGENTS.md — TalkEasy AI

## Status

Phase 10 (P2 Integration & Scaling) complete. Cognitive Runtime fully integrated into /talk route with persona persistence, caching, and telemetry. 431 tests passing (38 files), lint clean.

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
│   │   ├── history/[id]/route.ts       GET — session detail, DELETE — delete session
│   │   └── telemetry/route.ts          GET — telemetry summary/detail, DELETE — reset telemetry
│   ├── interview/page.tsx              orchestration layer (3 screens + hooks)
│   ├── history/page.tsx                history list (SessionCard + SkeletonList + EmptyHistory)
│   └── history/[id]/page.tsx           history detail (SessionMetaCard + NotFoundState + messages)
├── components/
│   └── ui/
│       ├── MessageBubble.tsx           shared message bubble (user/AI)
│       ├── ScoreCircle.tsx             score circle (lg/sm sizes)
│       ├── StrengthsImprovements.tsx   strengths/improvements grid
│       ├── AudioVisualizer.tsx         canvas-based frequency visualizer
│       ├── MicPermissionBanner.tsx     microphone permission banner
│       ├── LoadingSkeleton.tsx         animated pulse skeleton
│       ├── EmptyState.tsx              empty state with action button
│       ├── IntroScreen.tsx             interview intro (speed select, start button, errors)
│       ├── EndedScreen.tsx             interview end (score, summary, stats, nav buttons)
│       ├── ConversingScreen.tsx        interview conversing (sidebar, messages, transcript, status bar)
│       ├── SessionCard.tsx             history list card with score + delete
│       ├── SkeletonList.tsx            history list loading skeleton
│       ├── EmptyHistory.tsx            history list empty state
│       ├── SessionMetaCard.tsx         history detail metadata card (score + stats)
│       └── NotFoundState.tsx           history detail not found state
├── lib/
│   ├── constants.ts                    SPEECH_RATES
│   ├── mongoose.ts                     cached MongoDB connection
│   ├── store.ts                        unified store (MongoDB → in-memory fallback)
│   ├── memstore.ts                     in-memory store via globalThis (HMR-safe)
│   ├── ai/
│   │   ├── adapter.ts                  AiAdapter interface (mode + topic + industry params)
│   │   ├── openai.ts                   OpenAI adapter (mode-aware prompts)
│   │   ├── deepseek.ts                 DeepSeek adapter (JSON extraction fallback, mode-aware)
│   │   └── index.ts                    factory (env AI_PROVIDER)
│   └── ai/persona/ (Phase 9 — Cognitive Runtime)
│       ├── types.ts           PersonaConfig, EmotionalState, RuntimeState, RelationshipState, BehavioralPolicy, MemoryEvent, ConversationState, MemoryPolicy, etc.
│       ├── state.ts           EmotionalState valence/arousal/dominance, RuntimeState decay, ConversationState tracking, processSignal
│       ├── relationship.ts    familiarity/trust/comfort/humorAcceptance, signal processing, decay, quality scoring
│       ├── memory.ts          episodic compression + retrieval, MemoryPolicy-aware retention, memory summary
│       ├── policies.ts        Behavior Modulation Layer — verbosity, initiative, humor, interrupt, correction, mirror, topic persistence
│       ├── mutation.ts        State Mutation Rules Engine — RuleEvaluator, applyMutations, 11 built-in rules
│       ├── orchestrator.ts    cognitive pipeline coordinator
│       ├── persona.ts         PersonaAgent facade
│       ├── prompts.ts         dynamic persona prompt assembly
│       └── store.ts           event-sourced MongoDB collections
├── hooks/
│   ├── useSpeechRecognition.ts         STT hook (continuous, auto-restart, exponential backoff, error types)
│   ├── useSpeechSynthesis.ts           TTS hook (promise-based speak/cancel, lang/rate/pitch/volume)
│   ├── useSilenceDetection.ts          Silence detection via polling (configurable threshold/interval)
│   ├── useAiVoiceFilter.ts             AI echo cancellation via word-overlap-ratio (>0.6)
│   ├── useTimer.ts                     Countdown timer (active flag + onExpire callback)
│   ├── useMicPermission.ts             Microphone permission query via Permissions API
│   ├── useSessionList.ts               History list fetch + delete
│   └── useSessionDetail.ts             History detail fetch + delete
├── models/
│   └── Session.ts                      Mongoose schema (mode + topic + messages)
└── types/
    ├── index.ts                        shared types (Mode, Industry, Difficulty, Topic, Message, etc.)
    └── global.d.ts                     global mongoose + memstore type cache + webkitSpeechRecognition
```

## Architecture rules

- **ADR-001**: All AI calls through `AiAdapter` interface (`generateOpeningQuestion`, `generateConversationResponse`, `generateSummary`). Methods accept `mode` + `topic` + `industry`. Never hardcode a provider.
- **ADR-002**: Web Speech API only. No paid speech services. Chrome is the target browser.
- **ADR-003**: Design system via Tailwind v4 `@utility` + CSS variables. `glass` / `glass-hover` for glassmorphism cards. Brand gradient `from-indigo-500 to-purple-600`. Defined in `globals.css:root`.
- **ADR-004**: Mode system — `Mode = "interview" | "conversation"`. Conversation mode: user-led, AI initiates on 2.5s silence, `shouldEnd` always false. Separate AI prompts per mode.
- **ADR-005**: Hooks are separated by concern (STT, TTS, silence, echo-cancel) — not a monolithic VoiceSession. Each hook uses ref-based callbacks (`onResultRef`, `onSilenceRef`) updated in `useEffect` to avoid stale closures (React 19 compliant — no render-direct mutations).
- **ADR-006**: `useSpeechRecognition` is thin — it does NOT accumulate transcript internally. Parent manages via `onResult` callback and refs.
- **ADR-007**: Silence detection uses polling (interval) rather than `speechend` event for cross-browser reliability.
- **ADR-008**: STT restart attempts counter reset only on `onresult` (successful speech) or explicit `stopListening()`. Not reset in `startListening()` itself (defeats maxRestartAttempts). `onend` restarts are NOT subject to `maxRestartAttempts` — only error-based restarts (`onerror`) respect the limit. Natural session endings always restart.
- **ADR-009**: Test mocks use shared `vi.fn()` for `start`/`stop`/`abort` across all recognition instances (track total calls across restarts). Class-based mock uses static property (`MockSpeechRecognition.latestInstance`) instead of `this` aliasing.
- **ADR-010**: Async TTS tests use `await act(async () => { ... })` to flush microtasks for promise-based `speak()` flows.
- API routes use `connectDB()` from `src/lib/mongoose.ts` (cached singleton — safe to call repeatedly).
- **Store layer** (`src/lib/store.ts`): auto-detects MongoDB; falls back to in-memory if unavailable.
- **Memstore** (`src/lib/memstore.ts`): uses `globalThis` for HMR-safe persistence.
- Session: 15-minute timer. Continuous recording with 2.5s silence auto-submit via `/talk` API.
- DeepSeek adapter uses JSON extraction (find `{...}` in response) instead of `response_format`.
- `role` mapping: `"ai"` → `"assistant"` when sending to AI providers.
- `createSession` takes a params object `{ mode, industry?, topic?, difficulty, firstMessage }`.
- **ADR-011**: Workspace layout — `body` uses `h-screen overflow-hidden` to prevent page scrolling. Header is `shrink-0` (not `sticky`). Sidebar is `w-64 shrink-0`. Only the messages/content area uses `overflow-y-auto` (single scroll region). Fixed elements use `shrink-0` in flex layout. All `flex-1` ancestors in the chain must have `min-h-0`.
- **ADR-012** (`adr/ADR-012.md`): Screen component pattern — each interview phase extracted to a dedicated `src/components/ui/` screen component receiving all data via props; page.tsx reduced to orchestration layer (268 lines, was 451).
- **ADR-013** (`adr/ADR-013.md`): Cognitive Runtime Architecture — `src/lib/ai/persona/` as standalone engine with stateful persona, relationship as first-class object, event-sourced memory, behavioral policies modulation layer, and explicit state mutation rules. P0: engine, P1: behavioral validation, P2: integration.
- **ADR-014**: Policy/Mutation separation — `policies.ts` handles output modulation (what the AI says/does), `mutation.ts` handles state changes (how internal state evolves). Each has independent test suites and default rule sets. Policies consume state but don't mutate it; mutations consume signals and produce new state.
- **ADR-015**: English-only (en-US). Multi-language support removed: LANGUAGES constant deleted, language select/dropdown removed from IntroScreen, language badge removed from ConversingScreen sidebar. Hooks retain lang parameter defaulting to en-US.

## Env vars

```
AI_PROVIDER=openai|deepseek
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
MONGODB_URI=mongodb://localhost:27017/ai-english-practice
```