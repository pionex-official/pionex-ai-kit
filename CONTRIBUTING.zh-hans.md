[English](CONTRIBUTING.md) | 简体中文 | [繁體中文](CONTRIBUTING.zh-hant.md)

# 贡献指南 — Pionex AI Kit

本仓库是一个 monorepo，发布两个 npm 包：

- `@pionex/pionex-ai-kit`（CLI）
- `@pionex/pionex-trade-mcp`（MCP 服务器）

核心工具位于私有的 `@pionex-ai/core` 包中，并打包至上述两个公开包。

---

## 在本仓库进行开发

```bash
npm install
npm run build
```

运行构建产物：

- **CLI**（`@pionex/pionex-ai-kit`）：
  `node packages/cli/dist/index.js help`
  `node packages/cli/dist/index.js onboard`

- **MCP 服务器**（`@pionex/pionex-trade-mcp`）：
  `node packages/mcp/dist/index.js --help`

---

## 发布（从一个仓库发布两个包）

从仓库根目录执行：

```bash
cd packages/cli && npm publish --access public   # 发布 @pionex/pionex-ai-kit
cd ../mcp && npm publish --access public        # 发布 @pionex/pionex-trade-mcp
```

发布顺序不限，两个包之间没有相互依赖。
共用的 `@pionex-ai/core` 包为私有包，已打包至两个公开包中。

---

## 开发准则

- 尽可能保持 API 接口的向下兼容。
- 不得加入任何会记录或泄漏 API 密钥或敏感账户数据的代码。
- 对于较大的变更，请先开 issue 或提案讨论设计方向。
