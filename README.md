# ChatGPT → Obsidian Sidecar (Chrome Extension) v0.3

## v0.3 新增
- ✅ 标签模板（快速套用）
- ✅ 自动分类路由到不同 Obsidian 文档（按标签规则）
- ✅ 批量片段队列写入（防重复，基于哈希去重）

## v0.2 继承
- LLM 总结（OpenAI兼容接口）
- Obsidian Local REST API 直写
- Advanced URI 回退模式

## 核心用法
1. 在 ChatGPT 选中文本，右键发送到 Sidecar。
2. 选择标签模板 / 手动标签，写备注，自动总结。
3. 点“加入队列”，可连续加入多段。
4. 点“批量写入队列”，一次写入 Obsidian。

## 自动路由规则
在高级配置 `routeRules` 中配置（每行一条）：

```
#产品=>Inbox/Product.md
#技术=>Inbox/Tech.md
#风险=>Inbox/Risk.md
```

写入时若片段标签包含规则中的标签，就自动写到对应文档；否则写默认文档路径。

## 防重复说明
- 以 `selection + tags` 计算 SHA-256 哈希。
- 重复片段不会重复入队。

## 安装
1. `chrome://extensions`
2. 开启开发者模式
3. 加载已解压扩展程序 -> 本项目目录

## Obsidian 建议
- 推荐启用 **Local REST API** 插件（效率最高）
- 保底可用 **Advanced URI** 插件
