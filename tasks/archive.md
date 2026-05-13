# Archived Tasks

## Phase 7 — Voice Recognition Optimization (2026-05-10)

### P0 — 核心架构 (Hooks 抽取)

- [P0-001] 创建 `useSpeechRecognition` hook — STT 逻辑抽取，continuous 模式、auto-restart、指数退避、语言配置、权限检测、错误处理
- [P0-002] 创建 `useSpeechSynthesis` hook — TTS 逻辑抽取，speak/cancel、isSpeaking、promise 化、语速/语言/音量配置
- [P0-003] 创建 `useSilenceDetection` hook — 基于轮询的静默检测，可配置阈值/轮询间隔，函数式更新
- [P0-004] AI 语音回音消除工具 — 基于重叠率（overlap ratio > 0.6）的 AI 语音过滤算法

### P1 — 集成与用户体验

- [P1-001] 重构 page.tsx 集成新 hooks — 设置面板（语言选择、语速控制）、全局错误显示栏
- [P1-002] 麦克风权限检测与引导 UI — navigator.permissions.query 检测，未授权引导界面
- [P1-003] 音频可视化（基础麦克风指示器）— getUserMedia + AnalyserNode + Canvas 频率条
- [P1-004] 语言配置界面 — intro 页面语言选择器（20 种语言）和语速调节器

### P2 — 质量保障

- [P2-001] 编写新 hooks 的单元测试 — 48 项全部通过（useSpeechRecognition 13 + useSpeechSynthesis 8 + useSilenceDetection 8 + useAiVoiceFilter 8）
- [P2-002] 更新类型定义 — global.d.ts 添加 webkitSpeechRecognition 类型声明

## P3 — Polish

- [P3-001] 对话页面布局重构：左侧 w-64 Sidebar + 右侧 ChatPanel 双栏布局；layout.tsx 改为 h-screen overflow-hidden；history 页面加 scroll 容器；Interview Complete 页标题/按钮固定内容滚动

## Phase 8 — Page Modularization (2026-05-10)

### P0 — Shared Foundation

- [P0-005] 提取 constants (LANGUAGES, SPEECH_RATES) + 共享 UI 组件 (MessageBubble, ScoreCircle, StrengthsImprovements)
- [P0-006] 提取剩余共享组件 (AudioVisualizer, MicPermissionBanner, LoadingSkeleton, EmptyState)
- [P0-007] 提取自定义 hooks (useTimer, useMicPermission, useSessionList, useSessionDetail)
- [P0-008] 提取 IntroScreen 组件 — language/speed select、start button、error/mic banner
- [P0-009] 提取 EndedScreen 组件 — score circle、summary、stats、nav buttons
- [P0-010] 提取 ConversingScreen 组件 — sidebar、messages、transcript、status bar
- [P0-011] 精简 interview/page.tsx 为编排层 — 3 screens + hooks orchestration

### P1 — History Page Modularization

- [P1-005] 创建 SessionCard, SkeletonList, EmptyHistory, useSessionList — history 列表共享组件 + hook
- [P1-006] 使用 SessionCard + SkeletonList + EmptyHistory + useSessionList 重构 history/page.tsx (87→39 行)
- [P1-007] 创建 SessionMetaCard, NotFoundState, useSessionDetail — history 详情共享组件 + hook
- [P1-008] 使用 SessionMetaCard + NotFoundState + useSessionDetail 重构 history/[id]/page.tsx (98→67 行)

## Phase 9 — Cognitive Runtime: Engine Refactoring (2026-05-12)

### P0 — Type System Overhaul & New Modules

- [P0-022] Refactor types.ts — EmotionalState, SignalType 5新增, BehavioralPolicy 4新增, MemoryEvent 5新增, PersonaConfig 7新增, ConversationState, crypto.randomUUID()
- [P0-023] Refactor state.ts — EmotionalState 替代 mood, rm relationshipDrift, ConversationState tracking (updateConversationFromSignal, applyConversationDecay, updateUserMessageLength)
- [P0-024] Refactor memory.ts — MemoryPolicy 接口, determineMemoryLevel 接受 policy 参数, createMemoryEvent 计算 emotionalWeight/relationshipImpact
- [P0-025] Adapt all tests — 300 tests passing across 32 files (was 240)
- [P0-016] Behavioral policies (policies.ts) — Behavior Modulation Layer: getEffectiveVerbosity, shouldTakeInitiative, getHumorLevel, shouldInterruptSilence, getCorrectionUrgency, getMirrorIntensity, shouldPersistTopic, modulateResponse
- [P0-017] State mutation rules engine (mutation.ts) — RuleEvaluator, applyMutations, createDefaultRules (11 built-in), target resolution for runtime + relationship fields
- [P0-018] Cognitive pipeline orchestrator (orchestrator.ts) — runCognitivePipeline: signal→state→relationship→memory→mutations→decay→modulation, 15 tests
- [P0-019] PersonaAgent facade (persona.ts) — PersonaAgent class: constructor, processTurn, getState, needsIntervention, isEstablished, getMemorySummary, reset, 17 tests
- [P0-020] Dynamic prompt templates (prompts.ts) — buildSystemPrompt, buildUserTurnPrompt, buildModulationHints, persona-aware system prompt assembly, 20 tests
- [P0-021] Event-sourced store (store.ts) — InMemoryPersonaStore: createSession, appendEvent/getEvents/getEventsSince, saveSnapshot/getLatestSnapshot, deleteSession, 15 tests

### P1 — Behavioral Validation

- [P1-009] Memory recall consistency — recallEvent (append-safe lastIndexOf), getMostRecalled, findByImportanceRange, cross-query consistency tests (deterministic retrieval, category/importance cross-validation, idempotent compress), 15 new tests
- [P1-010] Tone consistency — computeTone() with EmotionalState (valence/arousal) as primary signal, relationship as secondary; Tone type added; prompt uses dynamic modulation.tone with config.baseTone fallback; 4 multi-turn consistency tests
- [P1-011] State drift behavior — 14 multi-turn integration tests for engagement death spiral, trust growth/decay, valence death spiral, compound rule interactions, relationship quality drift, signal sequences; fixed lastUserMessageLength bug via userMessage word count
- [P1-012] Initiative quality — getEffectiveVerbosity, shouldTakeInitiative, getHumorLevel enhanced with relationship state awareness; getEffectiveResponsePacing for dynamic response speed; shouldInterruptSilence uses adaptive pacing; 10 new tests

## Phase 10 — P2 Integration & Scaling (2026-05-12)

- [P2-005] Store optimization — MongoDB PersonaState model (sessionId unique index + updatedAt TTL index), MongoPersonaStore implementation, CachingPersonaStore decorator (5min TTL), HMR-safe InMemoryPersonaStore via globalThis, PersonaAgent.loadState() method, persistent store replaces module-level Map in /talk route
- [P2-006] Telemetry — TelemetryCollector module (pipeline latency, mutation rule fires, state change diffs, memory volume by category), integrated into PersonaAgent.processTurn via optional sessionId, GET/DELETE /api/telemetry endpoint with detail/sessionId filters, globalThis storage with 1000-record cap

## Phase 9 — Multi-language Removal (2026-05-12)

### P0 — Cleanup

- [P2-003] Conversation mode integration — Integrate PersonaAgent into /talk API route for conversation mode; update AiAdapter interface to accept persona context
- [P2-004] OpenAI/DeepSeek adapter update — Update OpenAI and DeepSeek adapters to use persona-enhanced prompt assembly from orchestrator
- [P0-026] Remove LANGUAGES constant — Delete LANGUAGES export from constants.ts; update constants.test.ts
- [P0-027] Remove language select from IntroScreen — Remove language select dropdown UI, onLangChange/selectedLang props; update test
- [P0-028] Remove language label from ConversingScreen — Remove language badge, LANGUAGES import, selectedLang prop; update test
- [P0-029] Update interview page orchestration — Remove selectedLang state, hardcode en-US in TTS/STT hooks, clean up props

## Phase 11 — Conversation Intelligence: Pipeline MVP (2026-05-13)

### P0 — Core Pipeline

- [P0-030] Intent Types + Fast Heuristics + Confidence — UserIntent type (7 intents), IntentResult with confidence, keyword/pattern-based classifier (35 rules), confidence scoring with aggregation
- [P0-031] Response Compression Policy — ResponseBudget (maxSentences, explanationDepth), deriveBudget with per-intent base + persona modulation + short-input clamp, budgetToPrompt rendering
- [P0-032] Pipeline 最小闭环 — runPipeline chaining intent→budget→prompt, standalone (no full orchestration dependency)
- [P0-033] Conversational Minimalism — enforceMinimalism: default no-teach unless ask_definition/ask_correction, low-confidence/short-input clamping
- [P0-034] Ambiguity Tolerance — assessAmbiguity (none/low/high), getCarryOnHint for natural bridging utterances, pipeline integration

### P1 — Conversation Intelligence: Advanced Features

- [P1-013] Conversation Momentum State — MomentumState (momentum/depth/responsiveness 0-1), cross-turn tracking via intent-driven deltas, budget modulation (+50%/-30%), prompt hints, pipeline integration
- [P1-014] LLM Semantic Intent Classifier — `classifyIntentWithLLM` async function, JSON constrained output (OpenAI response_format / DeepSeek extraction), sanitization, graceful degradation, fallback threshold at 0.4 confidence, `intentOverride` in PipelineInput
- [P1-015] Pipeline Full Orchestration Integration — `deriveSignalFromIntent` bridge (7 intent→signal mappings), PersonaAgent momentum tracking, mutual modulation loop (intent→signal→emotion→state←modulation←budget←momentum), ProcessTurnResult/PersonaAgentState extended

### P2 — Integration Testing & Edge Cases

- [P2-007] 集成测试 + 边界用例 — 42 new tests in `persona.integration.test.ts`: short input (empty/single char/single word), fuzzy intent (multi-pattern/conflicting/no-match), low confidence (momentum penalty/budget clamp), intent switching (definition→confirmation→correction→hesitation→emotional), full-loop mutual modulation (6-stage output, engagement/verbosity/familiarity modulation, momentum rise/fall, relationship establishment, intentOverride, long-conversation bounded values)
