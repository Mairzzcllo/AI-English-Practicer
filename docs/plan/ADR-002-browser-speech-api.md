# ADR-002: 使用浏览器 Web Speech API 处理语音

## 状态
Accepted

## 上下文
AI 模拟面试的核心交互是语音：AI 需要朗读问题（TTS），用户用语音回答（STT）。需要选择合适的语音处理方案。

## 决策
MVP 阶段完全使用浏览器内置的 **Web Speech API**，包括：
- `SpeechRecognition`（Chrome 兼容）用于语音识别
- `SpeechSynthesis` 用于语音合成

## 理由
- 零额外成本，无需购买第三方语音 API
- 无需服务端处理，延迟低
- 浏览器原生支持，集成简单
- 足够应对 MVP 的英语语音识别需求

## 后果
- 正面：零成本、低延迟、快速迭代
- 正面：用户数据留在本地，隐私友好
- 负面：Web Speech API 在不同浏览器兼容性有差异（Chrome 支持最好）
- 负面：发音评估能力有限，无法做精细的发音评分（MVP 使用 AI 基于文字做评分）

## 备选方案
1. OpenAI Whisper API → 准确度更高，但产生 API 调用费用和额外延迟
2. Azure Speech-to-Text → 企业级方案，更适合成熟产品
3. 自建语音模型 → 成本过高，不适合 MVP
