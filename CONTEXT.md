# CONTEXT.md

## Current (Phase 7)

Free Talk mode live — Mode selector + topic picker on home page. End button always visible (layout fix). Rebranded to TalkEasy AI.

## Changes this session

- Phase 7: New `Mode` type (`interview` | `conversation`), 8 predefined topics
- Home page: mode toggle (Mock Interview / Free Talk), conditional industry vs topic picker
- Interview page: mode-aware titles, intro text, header badge (shows topic/industry + mode label)
- AI adapter: all methods accept `mode` + `topic` params; conversation prompt — friendly partner, grammar correction by modeling, AI initiates on silence
- Session model: added `mode` + `topic` fields, `createSession` now takes params object
- History: list + detail show mode badge, topic/industry label, level info
- Layout fix: `<main>` gets `flex flex-col` so interview page properly constrains height — End button always visible
- Rebrand: AI English Mock Interview → TalkEasy AI

## To do

- [ ] Test with real DeepSeek API for end-to-end conversation
- [ ] Test with real OpenAI API
- [ ] Verify history summary generation with `generateSummary` (DeepSeek fallback)
- [ ] Data persistence for dev (file store fallback when MongoDB unavailable)

## ADR

- ADR-001: Glassmorphism Design System — CSS utility classes, brand gradient palette, layout container
- ADR-002: Mode system — `Mode = "interview" | "conversation"` with separate prompts per mode; conversation mode has user-led + AI-initiated-on-silence interaction
