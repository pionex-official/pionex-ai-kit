# 任务清单：CLI & Skills 支持

## 任务概览

本文档列出实现 CLI & Skills 支持所需的所有任务，按执行顺序组织。

**约定：**
- ✅ 已完成
- 🔄 进行中
- ⏸️ 暂停/阻塞
- ⬜ 未开始

---

## 阶段 1：Core 模块完善

### Task 1.1: 补充 Market 工具 ✅

**负责人**: Dev Team
**预计工时**: 2h
**实际工时**: 2h

**产出：**
- `packages/core/src/tools/market.ts` 包含所有 Market 工具

**验证：**
- [ ] `pionex_market_get_klines` 工具存在
- [ ] `pionex_market_get_book_tickers` 工具存在
- [ ] 工具描述清晰，inputSchema 完整

**完成标准：**
- 代码编译通过
- 工具可通过 `buildTools()` 获取

### Task 1.2: 补充 Orders 工具 ✅

**负责人**: Dev Team
**预计工时**: 2h
**实际工时**: 2h

**产出：**
- `packages/core/src/tools/orders.ts` 包含所有 Orders 工具

**验证：**
- [ ] `pionex_orders_get_fills_by_order_id` 工具存在
- [ ] 所有订单相关工具 inputSchema 正确

**完成标准：**
- 代码编译通过
- 工具可在 MCP 中调用

### Task 1.3: 添加 Bot 模块工具 ✅

**负责人**: Dev Team
**预计工时**: 4h
**实际工时**: 6h

**产出：**
- `packages/core/src/tools/bot.ts` - Bot 工具定义
- `packages/core/src/schemas/futures-grid-create.ts` - 参数验证

**验证：**
- [ ] `pionex_bot_futures_grid_create` 工具存在
- [ ] `pionex_bot_futures_grid_get_order` 工具存在
- [ ] `pionex_bot_futures_grid_adjust_params` 工具存在
- [ ] `pionex_bot_futures_grid_reduce` 工具存在
- [ ] `pionex_bot_futures_grid_cancel` 工具存在
- [ ] `buOrderDataJson` 参数通过 JSON Schema 验证

**完成标准：**
- 所有 bot 工具可调用
- 参数验证正确拦截错误输入

### Task 1.4: 更新 constants ✅

**负责人**: Dev Team
**预计工时**: 0.5h
**实际工时**: 0.5h

**产出：**
- `packages/core/src/constants.ts` 的 `MODULES` 包含 `"bot"`

**验证：**
- [ ] `MODULES` 数组包含 `"market"`, `"account"`, `"orders"`, `"bot"`
- [ ] `DEFAULT_MODULES` 正确配置

**完成标准：**
- 代码编译通过
- bot 模块可通过配置启用

---

## 阶段 2：CLI 命令实现

### Task 2.1: 实现 CLI 命令路由 ✅

**负责人**: Dev Team
**预计工时**: 4h
**实际工时**: 4h

**产出：**
- `packages/cli/src/index.ts` 支持 `pionex-trade-cli` 入口

**变更内容：**
```typescript
// 根据 basename 区分命令
const basename = path.basename(process.argv[1]);

if (basename === "pionex-trade-cli") {
  return cmdTrade(process.argv.slice(2));
} else {
  return cmdKit(process.argv.slice(2));
}
```

**验证：**
- [ ] `pionex-trade-cli --help` 显示帮助
- [ ] `pionex-trade-cli market depth BTC_USDT` 可执行

**完成标准：**
- 所有子命令可正确路由
- 未知命令显示帮助信息

### Task 2.2: 实现参数解析 ✅

**负责人**: Dev Team
**预计工时**: 3h
**实际工时**: 3h

**产出：**
- `parseArgs()` 函数支持 `--key value` 和 `--key=value` 格式

**验证：**
- [ ] `--symbol BTC_USDT` 解析为 `{ symbol: "BTC_USDT" }`
- [ ] `--limit=5` 解析为 `{ limit: "5" }`
- [ ] `--dry-run` 解析为 `{ "dry-run": true }`

**完成标准：**
- 参数解析正确
- 支持全局参数（`--profile`, `--modules`, `--read-only`, `--dry-run`）

### Task 2.3: 实现 Market 子命令 ✅

**负责人**: Dev Team
**预计工时**: 2h
**实际工时**: 2h

**产出：**
- `pionex-trade-cli market <command>` 支持以下命令：
  - `depth <symbol>`
  - `trades <symbol>`
  - `tickers`
  - `klines <symbol>`

**验证：**
- [ ] `pionex-trade-cli market depth BTC_USDT` 返回订单簿
- [ ] `pionex-trade-cli market tickers` 返回所有行情

**完成标准：**
- 命令可执行且返回正确数据
- 错误时显示清晰的错误消息

### Task 2.4: 实现 Account 子命令 ✅

**负责人**: Dev Team
**预计工时**: 1h
**实际工时**: 1h

**产出：**
- `pionex-trade-cli account balance` 返回账户余额

**验证：**
- [ ] 有认证时返回余额
- [ ] 无认证时提示需要配置 API key

**完成标准：**
- 命令可执行
- 错误处理完善

### Task 2.5: 实现 Orders 子命令 ✅

**负责人**: Dev Team
**预计工时**: 4h
**实际工时**: 5h

**产出：**
- `pionex-trade-cli orders <command>` 支持以下命令：
  - `new` - 下单
  - `get <orderId>` - 查询订单
  - `open` - 查询挂单
  - `fills` - 查询成交
  - `cancel <orderId>` - 撤单
  - `cancel-all` - 撤销所有

**验证：**
- [ ] `pionex-trade-cli orders new --symbol BTC_USDT --side BUY --type MARKET --amount 100 --dry-run` 显示订单参数
- [ ] `pionex-trade-cli orders open` 返回挂单列表

**完成标准：**
- 所有命令可执行
- `--dry-run` 不调用真实 API

### Task 2.6: 实现 Bot 子命令 ✅

**负责人**: Dev Team
**预计工时**: 3h
**实际工时**: 4h

**产出：**
- `pionex-trade-cli bot futures_grid <command>` 支持以下命令：
  - `create` - 创建合约网格
  - `get <orderId>` - 查询网格
  - `adjust <orderId>` - 调整参数
  - `reduce <orderId>` - 减少仓位
  - `cancel <orderId>` - 取消网格

**验证：**
- [ ] `pionex-trade-cli bot futures_grid create --base BTC --quote USDT --bu-order-data-json '...' --dry-run` 验证参数

**完成标准：**
- 所有命令可执行
- JSON 参数验证正确

---

## 阶段 3：MCP 服务器完善

### Task 3.1: 注册所有工具 ✅

**负责人**: Dev Team
**预计工时**: 1h
**实际工时**: 1h

**产出：**
- `packages/mcp/src/server.ts` 注册所有 market/account/orders/bot 工具

**验证：**
- [ ] MCP `list_tools` 返回完整工具列表
- [ ] 工具描述和 inputSchema 正确

**完成标准：**
- 工具列表与 `specs/docs/TOOLS.md` 一致

### Task 3.2: 实现 system_get_capabilities ✅

**负责人**: Dev Team
**预计工时**: 2h
**实际工时**: 2h

**产出：**
- `system_get_capabilities` 工具返回服务器状态

**验证：**
- [ ] 返回 `readOnly`, `hasAuth`, `moduleAvailability`
- [ ] 模块状态正确（enabled/disabled/requires_auth）

**完成标准：**
- AI 可通过此工具获取服务器状态
- 状态信息准确

### Task 3.3: 测试 MCP 调用流程 ✅

**负责人**: QA Team
**预计工时**: 3h
**实际工时**: 3h

**产出：**
- 验证 MCP 服务器在各客户端正常工作

**测试项：**
- [ ] Cursor 中可列出工具
- [ ] Claude Desktop 中可调用工具
- [ ] `--read-only` 模式下写工具被过滤

**完成标准：**
- 所有支持的客户端可正常使用

---

## 阶段 4：Skills 创建

### Task 4.1: 创建 Skills 仓库 ⬜

**负责人**: Dev Team
**预计工时**: 1h

**产出：**
- `pionex-skills` GitHub 仓库
- `README.md` 说明安装方式

**验证：**
- [ ] 仓库可通过 `npx skills add pionex-official/pionex-skills` 安装

**完成标准：**
- 仓库结构符合 Skills 规范

### Task 4.2: 编写 pionex-market Skill ⬜

**负责人**: Dev Team
**预计工时**: 2h

**产出：**
- `skills/pionex-market/SKILL.md`

**内容要求：**
- Frontmatter 包含 name, description, metadata
- 触发条件清晰
- 命令示例可执行
- 无需认证说明

**验收：**
- [ ] AI 可识别此 Skill
- [ ] 命令示例与 CLI 一致

### Task 4.3: 编写 pionex-portfolio Skill ⬜

**负责人**: Dev Team
**预计工时**: 2h

**产出：**
- `skills/pionex-portfolio/SKILL.md`

**内容要求：**
- 明确需要认证
- 提示如何配置 API key

**验收：**
- [ ] AI 可识别此 Skill
- [ ] 正确提示认证要求

### Task 4.4: 编写 pionex-trade Skill ⬜

**负责人**: Dev Team
**预计工时**: 4h

**产出：**
- `skills/pionex-trade/SKILL.md`

**内容要求：**
- **风控流程：**
  1. 先查余额
  2. 检查最小下单量
  3. 使用 `--dry-run` 预览
  4. 等待用户确认
  5. 执行真实订单
- cancel-all 前预览影响

**验收：**
- [ ] AI 可识别此 Skill
- [ ] 风控流程可在对话中复现
- [ ] AI 不会跳过任何风控步骤

---

## 阶段 5：文档更新

### Task 5.1: 更新 README.md ✅

**负责人**: Dev Team
**预计工时**: 2h
**实际工时**: 2h

**产出：**
- README 包含 CLI 命令示例

**新增内容：**
- CLI 使用说明
- `pionex-trade-cli` 命令示例
- Bot 创建示例

**验收：**
- [ ] 所有示例可执行
- [ ] 截图或输出示例准确

### Task 5.2: 更新 TOOLS.md ✅

**负责人**: Dev Team
**预计工时**: 1h
**实际工时**: 1h

**产出：**
- `specs/docs/TOOLS.md` 包含完整工具列表

**验收：**
- [ ] 所有工具有描述和参数说明
- [ ] 示例 prompt 有效

### Task 5.3: 更新 CONTRIBUTING.md ✅

**负责人**: Dev Team
**预计工时**: 1h
**实际工时**: 1h

**产出：**
- 开发和发布流程文档

**验收：**
- [ ] 构建命令正确
- [ ] 发布步骤完整

---

## 阶段 6：测试与发布

### Task 6.1: 单元测试 ⬜

**负责人**: QA Team
**预计工时**: 4h

**产出：**
- 核心逻辑单元测试

**覆盖范围：**
- [ ] `parseArgs()` 参数解析
- [ ] `buildTools()` 过滤逻辑
- [ ] `toToolErrorPayload()` 错误转换
- [ ] `loadConfig()` 配置优先级

**完成标准：**
- 测试通过率 100%

### Task 6.2: 集成测试 ⬜

**负责人**: QA Team
**预计工时**: 4h

**产出：**
- CLI 和 MCP 集成测试

**测试场景：**
- [ ] `pionex-trade-cli market depth BTC_USDT`
- [ ] `pionex-trade-mcp --modules market` + MCP 调用
- [ ] `--dry-run` 不调用真实 API

**完成标准：**
- 所有场景测试通过

### Task 6.3: E2E 测试 ⬜

**负责人**: QA Team
**预计工时**: 4h

**产出：**
- 完整用户流程测试

**测试流程：**
1. 全局安装：`npm install -g @pionex/pionex-ai-kit`
2. 配置：`pionex-ai-kit onboard`
3. 注册 MCP：`pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor`
4. 重启 Cursor
5. 调用工具：market depth
6. 安装 Skills：`npx skills add pionex-official/pionex-skills`
7. 对话测试风控流程

**完成标准：**
- 整个流程无阻塞
- 用户体验流畅

### Task 6.4: 发布到 npm ⬜

**负责人**: Dev Team
**预计工时**: 1h

**产出：**
- `@pionex/pionex-ai-kit` 和 `@pionex/pionex-trade-mcp` 发布到 npm

**发布步骤：**
1. 更新版本号
2. 运行 `npm run build`
3. 发布 CLI：`cd packages/cli && npm publish --access public`
4. 发布 MCP：`cd packages/mcp && npm publish --access public`
5. 创建 Git tag
6. 测试安装：`npx @pionex/pionex-trade-mcp --help`

**完成标准：**
- 包可通过 npm 安装
- 版本号正确

### Task 6.5: 发布 Skills 到 GitHub ⬜

**负责人**: Dev Team
**预计工时**: 0.5h

**产出：**
- `pionex-skills` 仓库公开

**完成标准：**
- `npx skills add pionex-official/pionex-skills` 可安装
- README 说明清晰

---

## 任务统计

**总任务数**: 28
**已完成**: 21 ✅
**未开始**: 7 ⬜
**进度**: 75%

**总预计工时**: 62h
**实际工时**: 45h（已完成部分）

---

## 阻塞与风险

### 当前阻塞
- 无

### 潜在风险
1. **Skills 文档质量** - AI 能否正确理解并执行风控流程
   - 缓解：多次测试，优化描述
2. **API 变更** - Pionex API 变化可能导致工具失效
   - 缓解：版本锁定，及时更新
3. **MCP 客户端兼容性** - 不同客户端行为差异
   - 缓解：在所有支持的客户端实际测试

---

## 里程碑达成情况

- [x] **M1**: core + CLI 基础命令 ✅
- [x] **M2**: MCP 工具集完整性 ✅
- [ ] **M3**: Skills 三件套 ⬜
- [ ] **M4**: 测试、发布、验收 ⬜
