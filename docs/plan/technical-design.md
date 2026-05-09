# 技术设计方案：AI English Mock Interview

## 架构概览

```
┌─────────────────────────────────────────────────────┐
│                    Next.js App                       │
│  ┌───────────────────────────────────────────────┐  │
│  │                Client Layer                    │  │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────────┐ │  │
│  │  │ Interview │  │  History  │  │  Settings    │ │  │
│  │  │   Page    │  │   Page   │  │    Page      │ │  │
│  │  └────┬─────┘  └──────────┘  └──────────────┘ │  │
│  │       │                                        │  │
│  │  ┌────▼─────────────────────────────────────┐  │  │
│  │  │         Shared Components                │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ │  │  │
│  │  │  │ VoiceRec │ │ Feedback │ │ Timer    │ │  │  │
│  │  │  │ order    │ │  Card   │ │          │ │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
│                          │                           │
│  ┌───────────────────────▼─────────────────────────┐ │
│  │              API Routes (Server)                 │ │
│  │  ┌──────────────┐  ┌────────────┐  ┌─────────┐  │ │
│  │  │  Interview   │  │   Feedback  │  │ History │  │ │
│  │  │    API       │  │    API     │  │   API   │  │ │
│  │  └──────┬───────┘  └─────┬──────┘  └────┬────┘  │ │
│  └─────────┼────────────────┼───────────────┼───────┘ │
└────────────┼────────────────┼───────────────┼──────────┘
             │                │               │
     ┌───────▼────┐   ┌──────▼──────┐   ┌────▼──────┐
     │  AI Model  │   │  Web Speech │   │  MongoDB  │
     │  Adapter   │   │     API     │   │           │
     │            │   │ (Browser)   │   │           │
     │ OpenAI/    │   │ STT + TTS   │   │ Sessions  │
     │ DeepSeek   │   │             │   │ History   │
     └────────────┘   └─────────────┘   └───────────┘
```

## 组件划分

| 组件 | 职责 | 技术选型 |
|------|------|----------|
| Web UI | 用户界面 | Next.js 14+ (App Router) + React + Tailwind CSS |
| 语音识别 | 浏览器端语音转文字 | Web Speech API (SpeechRecognition) |
| 语音合成 | 浏览器端文字转语音 | Web Speech API (SpeechSynthesis) |
| AI 适配层 | 统一多模型调用接口 | 自定义 Adapter 模式 |
| 数据存储 | 会话/历史记录持久化 | MongoDB + Mongoose |
| 部署 | 应用部署 | Vercel |

## 数据流

### 面试流程
```
1. 用户选择行业 + 难度 → 发起面试
2. Next.js API Route → AI Adapter → AI 返回面试题
3. AI 问题 → TTS 播报 + 文字显示
4. 用户语音回答 → Web Speech API → 实时转文字
5. 用户回答文字 → AI Adapter → AI 返回纠错/评分/建议
6. 反馈展示给用户 → 存入 MongoDB
7. 重复 2-6 直到面试结束
8. 面试总结 → 存入 MongoDB → 历史记录可查
```

## 数据模型

```typescript
// Interview Session
{
  _id: ObjectId,
  industry: string,       // "tech" | "marketing" | "management" | ...
  difficulty: string,     // "beginner" | "intermediate" | "advanced"
  status: string,         // "in_progress" | "completed"
  createdAt: Date,
  updatedAt: Date,
  questions: Question[]
}

// Question
{
  questionId: number,
  question: string,       // AI 提出的问题
  userAnswer: string,     // 用户语音转文字的回答
  feedback: {
    grammar: string[],     // 语法问题列表
    wordChoice: string[],  // 用词建议
    pronunciationScore: number, // 发音评分 (0-100)
    overallScore: number,  // 综合评分
    suggestion: string,    // AI 改进建议
  },
  duration: number,       // 回答时长（秒）
  createdAt: Date
}
```

## API 设计

### POST /api/interview/start
- Request: `{ industry, difficulty }`
- Response: `{ sessionId, question: { text, audio? } }`

### POST /api/interview/answer
- Request: `{ sessionId, questionId, userAnswer }`
- Response: `{ feedback: { grammar, wordChoice, pronunciationScore, overallScore, suggestion } }`

### POST /api/interview/next-question
- Request: `{ sessionId, questionId }`
- Response: `{ question: { text, audio? }, isComplete: boolean }`

### POST /api/interview/end
- Request: `{ sessionId }`
- Response: `{ summary: { totalQuestions, avgScore, duration } }`

### GET /api/history
- Response: `{ sessions: SessionSummary[] }`

### GET /api/history/:id
- Response: `{ session: SessionDetail }`

## 多模型适配架构

```
┌─────────────────────┐
│   AI Adapter (interface) │
│  + generateQuestion()   │
│  + generateFeedback()   │
│  + generateSummary()    │
└────────┬────────────┘
         │
    ┌────┴────┬──────────┐
    │         │          │
┌───▼──┐ ┌───▼───┐ ┌───▼───┐
│OpenAI│ │DeepSeek│ │Claude │
│Adapter│ │Adapter │ │Adapter│
└──────┘ └───────┘ └───────┘
```

通过环境变量 `AI_PROVIDER` 切换，新增模型只需实现 Adapter 接口。
