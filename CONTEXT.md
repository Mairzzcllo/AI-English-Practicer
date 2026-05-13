# 项目上下文
- 迭代: Phase 11 (Conversation Intelligence) | 分支: main
- 进行中: P2-007
- 已完成: P0-004 (4 voice hooks) | P0-005~P0-007 (shared components + hooks extraction) | P0-008~P0-011 (interview 3 screens + orchestration) | P1-004 (page integration) | P1-005~P1-008 (history 页面拆分) | P2-002 (48 tests) | P3-001 (workspace layout) | P0-012~P0-015 (初版 types/state/relationship/memory) | P0-022~P0-025 (类型系统重构) | P0-016 (policies.ts) | P0-017 (mutation.ts) | P0-018~P0-021 (引擎构建: orchestrator/persona/prompts/store) | P1-009 (memory recall consistency) | P1-010 (tone consistency) | P1-011 (state drift behavior) | P1-012 (initiative quality) | P2-003~P2-004 (persona integration) | P0-026~P0-029 (移除多语言) | P2-005 (store optimization) | P2-006 (telemetry) | P0-030~P0-034 (Conversation Intelligence P0 pipeline: intent→budget→minimalism→ambiguity→prompt) | P1-013 (Conversation Momentum State) | P1-014 (LLM Semantic Intent Classifier) | P1-015 (Pipeline orchestration integration)
- 待办: P2-007 (集成测试 + 边界用例)
- 测试: 595 tests passing (45 files)
- ADR: 17 (inline in AGENTS.md + ADR-012 + ADR-013 + ADR-016 + ADR-017)
- 注意: 多语言已移除; hooks lang 参数默认 en-US; persona/ 目录现有 14 个模块 (+ telemetry.ts, + PersonaState model); conversation/ 目录: types.ts, intent.ts, budget.ts, minimalism.ts, ambiguity.ts, pipeline.ts, momentum.ts, llm-intent.ts (8 modules, 185 tests); Phase 11 P1 complete — momentum + LLM classifier + mutual modulation integrated into PersonaAgent
