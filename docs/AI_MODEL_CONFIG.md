# OpenClaw AI 模型配置指南

## 🎯 默认模型优先级

系统已配置以下优先级（从高到低）：

1. **DeepSeek** (默认) - 推荐 ✅
2. **DashScope (通义千问)**
3. **Moonshot (Kimi)**
4. **Zhipu (智谱)**
5. **Anthropic (Claude)**
6. **OpenAI (GPT)**

## 🔧 配置说明

### 当前默认配置

```typescript
// 文件: apps/gateway/src/services/ai.ts
const priority = [
  'deepseek',      // 第一优先级
  'dashscope',     // 第二优先级
  'moonshot',      // 第三优先级
  'zhipu',         // 第四优先级
  'anthropic',     // 第五优先级
  'openai'         // 最后优先级
];
```

### 为什么优先使用 DeepSeek？

| 优势 | 说明 |
|------|------|
| ✅ 国内直连 | 无需翻墙，网络稳定 |
| ✅ 性价比高 | 成本低，效果好 |
| ✅ 中文优化 | 对中文理解和生成优秀 |
| ✅ 代码能力 | 编程辅助能力强 |

## 📝 环境变量配置

### DeepSeek (默认)
```env
DEEPSEEK_API_KEY="sk-your-api-key"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
```

### 其他模型（可选）
```env
# 通义千问
DASHSCOPE_API_KEY="sk-your-key"

# Kimi
MOONSHOT_API_KEY="sk-your-key"

# 智谱
ZHIPU_API_KEY="your-key"

# Claude
ANTHROPIC_API_KEY="sk-your-key"
ANTHROPIC_BASE_URL="https://your-proxy-url"
```

## 🎮 使用方式

### 方式 1: 使用默认模型（推荐）
- 无需选择，系统自动使用 DeepSeek
- 适合大多数场景

### 方式 2: 手动切换模型
- 在对话页面顶部下拉框选择
- 可切换到其他已配置的模型

### 方式 3: 指定模型对话
```
在消息中指定："使用 Claude 回答这个问题..."
```

## 🔄 修改默认模型

如需修改默认优先级，编辑文件：

```typescript
// apps/gateway/src/services/ai.ts

export function getDefaultModel(): { provider: string; model: string } {
  // 修改这里的优先级顺序
  const priority = [
    'deepseek',    // 改为第一
    'dashscope',
    'moonshot',
    'zhipu',
    'anthropic',
    'openai'
  ];
  // ...
}
```

修改后重启后端服务生效。

## 💡 模型选择建议

| 场景 | 推荐模型 | 原因 |
|------|---------|------|
| 日常对话 | DeepSeek | 快速、稳定、中文好 |
| 代码编程 | DeepSeek / Claude | 代码理解和生成能力强 |
| 长文本处理 | Kimi | 支持超长上下文 |
| 创意写作 | 通义千问 | 中文创意表达优秀 |
| 逻辑推理 | Claude | 推理能力突出 |

## ⚠️ 注意事项

1. **API Key 余额**：确保配置的 API Key 有足够余额
2. **网络连接**：国内模型无需翻墙，国外模型需要代理
3. **模型可用性**：如果默认模型不可用，自动切换到下一个
4. **成本考虑**：不同模型价格不同，DeepSeek 性价比最高

## 🆘 故障排查

### 问题：模型无响应
```
检查：
1. API Key 是否正确
2. 余额是否充足
3. 网络连接是否正常
```

### 问题：想切换默认模型
```
解决：
1. 修改 apps/gateway/src/services/ai.ts
2. 调整 priority 数组顺序
3. 重启后端服务
```

---

**当前默认模型：DeepSeek** ✅
