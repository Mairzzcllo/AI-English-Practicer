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
