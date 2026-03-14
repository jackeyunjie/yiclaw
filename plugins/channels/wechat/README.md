# WeChat Channel Plugin

微信个人号通道插件，让你的 AI 员工进入真实的微信群进行测试。

## 功能特性

- ✅ 微信扫码登录
- ✅ 私聊消息处理
- ✅ 群聊消息处理（需@或触发词）
- ✅ 自动维护联系人/群列表
- ✅ 自动接受好友请求（可选）
- ✅ 入群欢迎消息

## 安装

```bash
pnpm --filter @openclaw/plugin-wechat-channel build
```

## 配置

在环境变量或配置文件中添加：

```env
# .env
WECHAT_NAME=YiClawBot
WECHAT_AUTO_ACCEPT_FRIEND=false
WECHAT_ADMIN_WECHAT_ID=your_admin_id
```

或在 Gateway 配置中：

```typescript
{
  "wechat": {
    "name": "YiClawBot",
    "autoAcceptFriend": false,
    "adminWechatId": "your_admin_wechat_id",
    "targetRooms": ["测试群1", "测试群2"],
    "triggerWords": ["@YiClaw", "@AI", "@助手"]
  }
}
```

## 配置说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `name` | string | YiClawBot | 机器人名称（用于数据存储） |
| `autoAcceptFriend` | boolean | false | 是否自动接受好友请求 |
| `adminWechatId` | string | - | 管理员微信号（用于接收通知） |
| `targetRooms` | string[] | - | 指定处理的群名称（为空则处理所有群） |
| `triggerWords` | string[] | @YiClaw,@AI,@助手 | 触发词（群聊中使用） |

## 使用方法

### 启动 Gateway

```bash
pnpm --filter gateway dev
```

### 首次登录

1. 启动后，终端会显示二维码 URL
2. 使用微信扫码登录
3. 登录成功后显示：
   ```
   🎉 微信登录成功!
   👤 用户: YourName
   ```

### 私聊使用

直接发送消息给机器人，无需任何触发词。

### 群聊使用

在群里使用时需要触发：
- @机器人（机器人会被@）
- 或包含触发词（如"@YiClaw 你好"）

### 入群欢迎

当机器人被邀请进群时，会自动发送：
```
大家好！我是 YiClaw AI 助手，有问题随时@我 😊
```

## 安全提示

⚠️ **注意**：使用微信个人号作为 Bot 存在以下风险：

1. **封号风险** - 微信可能检测并封禁自动化账号
2. **频率限制** - 消息发送过于频繁可能触发限制
3. **建议** - 使用小号进行测试，不要用主号

## 技术说明

- 基于 [Wechaty](https://wechaty.js.org/) 框架
- 使用 [wechaty-puppet-wechat4u](https://github.com/wechaty/puppet-wechat4u) 协议
- 不需要额外服务器，直接通过网页微信协议接入

## 故障排查

### 二维码无法扫描

- 检查终端输出的完整二维码 URL
- 尝试复制 URL 到浏览器打开

### 登录后掉线

- 微信网页版协议不稳定，可能会掉线
- 重新扫码即可恢复

### 收不到群消息

- 检查是否在 `targetRooms` 列表中（如果配置了）
- 确认是否正确@了机器人
- 检查触发词配置

## 更新日志

### v1.0.0

- 初始版本
- 支持私聊和群聊
- 支持扫码登录
- 支持触发词配置
