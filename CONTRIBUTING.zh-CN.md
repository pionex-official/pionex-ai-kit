# 为 Pionex AI Kit 做贡献

本仓库是一个 monorepo，用于发布两个 npm 包：

- `@pionex/pionex-ai-kit`（CLI）
- `@pionex/pionex-trade-mcp`（MCP Server）

公共能力封装在私有包 `@pionex-ai/core` 中，并在发布时打包进两个公开包。

---

## 在本仓库进行开发

```bash
npm install
npm run build
```

构建完成后可以这样运行：

- **CLI**（`@pionex/pionex-ai-kit`）：  
  `node packages/cli/dist/index.js help`  
  `node packages/cli/dist/index.js onboard`

- **MCP Server**（`@pionex/pionex-trade-mcp`）：  
  `node packages/mcp/dist/index.js --help`

---

## 发布（一个仓库发布两个 npm 包）

在仓库根目录执行：

```bash
cd packages/cli && npm publish --access public   # 发布 @pionex/pionex-ai-kit
cd ../mcp && npm publish --access public        # 发布 @pionex/pionex-trade-mcp
```

两个包之间没有直接依赖关系，发布顺序无强制要求。  
共享的 `@pionex-ai/core` 为私有包，在构建阶段会被打包进上述两个公开包。

---

## 贡献规范

- 尽量保持对已有 API 的向后兼容。
- 禁止引入会泄露 API Key 或账户敏感信息的日志 / 追踪代码。
- 对于较大改动，建议先通过 Issue 或设计文档讨论方案再提交 PR。

