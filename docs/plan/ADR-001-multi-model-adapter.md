# ADR-001: 多模型适配器架构

## 状态
Accepted

## 上下文
AI 英语模拟面试需要调用大语言模型来生成面试题和反馈。市面上有多种可选的 AI 模型（OpenAI GPT-4o、DeepSeek、Anthropic Claude 等），且模型能力和价格各异。需求明确要求支持多模型接入和切换。

## 决策
采用 **Adapter 模式** 设计统一的 AI 模型适配层。定义 `AiAdapter` 接口，包含 `generateQuestion()`、`generateFeedback()`、`generateSummary()` 三个核心方法。各模型提供商实现此接口。通过环境变量 `AI_PROVIDER` 在运行时切换。

## 理由
- 新增模型只需实现接口，不修改现有代码（开闭原则）
- 业务逻辑与 AI 实现解耦，方便测试
- 可以按场景选择不同模型（如 DeepSeek 用于生成，GPT-4o 用于反馈）
- 统一接口便于后续缓存和重试逻辑的添加

## 后果
- 正面：扩展性强，方便切换和对比模型效果
- 正面：测试时可以轻松 mock AI 调用
- 负面：需要维护多个适配器的 Prompt 兼容性，不同模型对 Prompt 格式敏感度不同

## 备选方案
1. 硬编码单个模型 → 灵活扩展性差，不满足需求
2. 用 if-else 多路分支 → 违反开闭原则，代码难以维护
3. 使用 AI Gateway（如 Portkey、LiteLLM）→ 引入外部依赖，小项目过于复杂
