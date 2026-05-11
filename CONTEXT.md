# 项目上下文
- 迭代: Phase 8 (Page Modularization) | 分支: main
- 进行中: —
- 已完成: P0-004 (4 voice hooks) | P0-005~P0-007 (shared components + hooks extraction) | P0-008~P0-011 (interview 3 screens + orchestration) | P1-004 (page integration) | P1-005~P1-008 (history 页面拆分) | P2-002 (48 tests) | P3-001 (workspace layout)
- 待办: —
- 测试: 163 tests passing
- ADR: 12 (inline in AGENTS.md + SessionMetaCard extraction pattern)
- 注意: hooks 使用 ref-based callback pattern; STT mock 用 shared vi.fn(); silence detection 用 polling; 布局 body h-screen overflow-hidden; src/components/ui/ 目录含 16 个共享组件 (新增 IntroScreen, EndedScreen, ConversingScreen, SessionCard, SkeletonList, EmptyHistory, SessionMetaCard, NotFoundState)
