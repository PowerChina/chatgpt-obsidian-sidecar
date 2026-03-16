# ChatGPT → Obsidian Sidecar (Chrome Extension) v0.2

右侧浮窗插件：在 ChatGPT 选中文本后，添加标签/备注，一键写入 Obsidian 文档。

## v0.2 新增

- ✅ LLM 总结（OpenAI 兼容接口）
- ✅ Obsidian Local REST API 直写（推荐）
- ✅ Advanced URI 回退模式（保底）

## 功能

- 右侧浮窗（Chrome Side Panel）
- ChatGPT 页面选中文本自动捕获
- 右键菜单：发送选中文本到侧栏
- 标签、备注、自动总结（LLM优先，本地规则回退）
- 一键写入 Obsidian 指定文档

## 安装

1. 打开 `chrome://extensions`
2. 开启开发者模式
3. 加载已解压扩展程序，选择本目录

## 配置与使用

### A. 推荐：Local REST API 直写

1. Obsidian 安装并启用 **Local REST API** 插件
2. 复制插件生成的 API Key
3. 在侧栏高级配置填写：
   - `Obsidian REST Base`: 默认 `http://127.0.0.1:27124`
   - `Obsidian REST API Key`
4. 写入模式选 `Local REST API`
5. 填写 Vault 与文档路径（如 `Inbox/ChatGPT-Notes.md`）

### B. 回退：Advanced URI

1. 启用 Obsidian **Advanced URI** 插件
2. 写入模式选 `Advanced URI`
3. 点击写入后会触发 `obsidian://` 链接

### C. LLM 总结

1. 在高级配置填写：
   - `LLM Endpoint`（默认 `https://api.openai.com/v1/chat/completions`）
   - `LLM API Key`
   - `LLM Model`（默认 `gpt-4o-mini`）
2. 点击「自动总结（LLM优先）」

## 下一步可做（v0.3）

- 标签模板与自动分类
- 一键写入到不同 Obsidian 文档（按标签路由）
- 批量片段队列与去重
- 选中段落自动抓取对话上下文
