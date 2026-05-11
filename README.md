# TalkEasy AI

Practice English interviews and casual conversations with an AI tutor. Speak naturally, get instant responses, and receive detailed feedback on your performance.

## Features

- **Two modes**: Choose a structured industry interview or a free-flowing conversation
- **Voice interaction**: Speak your answers — the AI listens and responds in real time
- **Instant feedback**: After each session, get an overall score with strengths and areas to improve
- **Session history**: Review past conversations with full transcripts and scores
- **15-minute sessions**: Timed practice sessions with auto-detect silence

## Quick Start

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and add your API keys:

   ```bash
   cp .env.local.example .env.local
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) and start practicing.

> **Note**: Chrome is recommended for the best speech recognition experience. MongoDB is optional — the app falls back to in-memory storage for development.

## Tech

| Layer | |
|-------|-|
| Framework | Next.js 16 |
| UI | React 19 + Tailwind CSS v4 |
| Voice | Web Speech API |
| AI | OpenAI / DeepSeek |
| Database | MongoDB |

## License

MIT
