# ChatGPT → Obsidian Sidecar (Chrome Extension)

右侧浮窗插件：在 ChatGPT 选中文本后，添加标签/备注，一键写入 Obsidian 文档。

## 功能（MVP）

- 右侧浮窗（Chrome Side Panel）
- ChatGPT 页面选中文本自动捕获
- 右键菜单：发送选中文本到侧栏
- 标签、备注、自动总结
- 一键写入 Obsidian 指定文档（通过 `obsidian://advanced-uri`）

## 使用步骤

1. 安装依赖插件（Obsidian 侧）
   - Obsidian 安装并启用 **Advanced URI** 插件
2. 安装本扩展
   - 打开 `chrome://extensions`
   - 打开开发者模式
   - 选择“加载已解压的扩展程序”
   - 指向本项目目录
3. 使用
   - 在 ChatGPT 页面选中一段文字
   - 右键 -> `发送选中文本到 Obsidian Sidecar`
   - 侧栏补充标签/备注/总结
   - 填 Vault 名称和文档路径（例如 `Inbox/ChatGPT-Notes.md`）
   - 点击“写入文档”

## 后续可升级

- 接入 LLM API 做高质量总结（OpenAI/Claude）
- 改为 Local REST API 直写 Obsidian（无 URI 跳转）
- 标签模板、自动分类、批量写入
