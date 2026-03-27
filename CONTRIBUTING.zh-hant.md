[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-hans.md) | 繁體中文

# 貢獻指南 — Pionex AI Kit

本倉庫是一個 monorepo，發佈兩個 npm 套件：

- `@pionex/pionex-ai-kit`（CLI）
- `@pionex/pionex-trade-mcp`（MCP 伺服器）

核心工具位於私有的 `@pionex-ai/core` 套件中，並打包至上述兩個公開套件。

---

## 在本倉庫進行開發

```bash
npm install
npm run build
```

執行建置產物：

- **CLI**（`@pionex/pionex-ai-kit`）：
  `node packages/cli/dist/index.js help`
  `node packages/cli/dist/index.js onboard`

- **MCP 伺服器**（`@pionex/pionex-trade-mcp`）：
  `node packages/mcp/dist/index.js --help`

---

## 發佈（從一個倉庫發佈兩個套件）

從倉庫根目錄執行：

```bash
cd packages/cli && npm publish --access public   # 發佈 @pionex/pionex-ai-kit
cd ../mcp && npm publish --access public        # 發佈 @pionex/pionex-trade-mcp
```

發佈順序不限，兩個套件之間沒有相互依賴。
共用的 `@pionex-ai/core` 套件為私有套件，已打包至兩個公開套件中。

---

## 開發準則

- 盡可能保持 API 介面的向下相容。
- 不得加入任何會記錄或洩漏 API 金鑰或敏感帳戶資料的程式碼。
- 對於較大的變更，請先開 issue 或提案討論設計方向。
