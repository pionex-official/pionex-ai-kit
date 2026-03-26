# 迭代复盘：CLI & Skills 支持

## 迭代信息

**迭代周期**: 2026-03-17 ~ 2026-03-19
**目标**: 添加完整的 CLI 命令支持和 Skills 集成能力
**状态**: 部分完成（CLI & MCP 已完成，Skills 未开始）

---

## 完成情况

### 已完成功能

#### 1. CLI 命令支持 ✅
- `pionex-trade-cli` 命令别名实现
- Market 子命令（depth, trades, tickers, klines）
- Account 子命令（balance）
- Orders 子命令（new, get, open, fills, cancel, cancel-all）
- Bot 子命令（futures_grid create/get/adjust/reduce/cancel）
- 全局参数支持（`--profile`, `--modules`, `--read-only`, `--dry-run`）

**实际产出:**
- `packages/cli/src/index.ts` 完整实现命令路由和参数解析
- 约 700 行新增代码

#### 2. Bot 模块工具 ✅
- 新增 `packages/core/src/tools/bot.ts`（约 400 行）
- 新增 `packages/core/src/schemas/futures-grid-create.ts` JSON Schema 验证
- 支持合约网格 Bot 的完整生命周期操作

**实际产出:**
- 5 个 Bot 工具：create, get_order, adjust_params, reduce, cancel
- 严格的参数验证（buOrderDataJson）

#### 3. Market 工具补充 ✅
- 新增 `pionex_market_get_book_tickers` 工具
- 新增 `pionex_market_get_klines` 工具

#### 4. Orders 工具补充 ✅
- 新增 `pionex_orders_get_fills_by_order_id` 工具

#### 5. MCP 服务器完善 ✅
- 所有工具正确注册
- `system_get_capabilities` 工具实现
- 模块状态正确返回（enabled/disabled/requires_auth）

### 未完成功能

#### 1. Skills 仓库 ❌
- 原计划创建 `pionex-skills` 仓库
- 原因：时间优先级调整，先完成 CLI 和 MCP 核心功能
- 影响：用户需自行理解工具用法，缺少 AI 流程指导

#### 2. 完整的 dry-run 实现 ⚠️
- 当前 `--dry-run` 仅在 CLI 层通过 `config.readOnly` 过滤工具
- 未在工具 handler 内部实现真正的"模拟执行"
- 影响：用户无法预览写操作的完整效果

#### 3. 自动化测试 ❌
- 无单元测试
- 无集成测试
- 原因：优先保证功能完整性
- 影响：重构时容易引入 bug，依赖手动测试

---

## 技术决策回顾

### 决策 1: 手写参数解析 ✅

**决策**: 不引入 `commander` 等 CLI 框架，手写简单的参数解析器

**理由**:
- 保持零依赖目标
- 参数简单，不需要复杂功能

**结果**:
- ✅ 成功实现，代码约 50 行
- ✅ 支持 `--key value` 和 `--key=value` 两种格式
- ⚠️ 不支持复杂参数（数组、嵌套对象），但当前需求不需要

**经验**: 对于简单场景，手写比引入依赖更轻量

### 决策 2: JSON Schema 验证合约网格参数 ✅

**决策**: 使用 JSON Schema 验证 `buOrderDataJson` 参数

**理由**:
- 参数复杂（10+ 字段），手动验证容易遗漏
- JSON Schema 提供标准化的验证和错误消息

**结果**:
- ✅ 验证逻辑清晰，错误消息准确
- ✅ 导出 schema 常量供 CLI help 使用
- ⚠️ 增加了约 150 行代码，但提升了用户体验

**经验**: 对于复杂参数，使用 JSON Schema 是正确选择

### 决策 3: 优先 CLI 而非 Skills ⚠️

**决策**: 先完成 CLI 和 MCP 核心功能，延后 Skills 创建

**理由**:
- CLI 是 Skills 的基础（Skills 调用 CLI 命令）
- 时间有限，需要优先保证核心功能可用

**结果**:
- ✅ CLI 和 MCP 功能完整，可独立使用
- ❌ 缺少 AI 流程指导，用户需要自行理解工具用法
- ⚠️ 风控流程未文档化，可能导致用户误操作

**经验**: 应该在功能完成后立即补充文档，避免技术债累积

---

## 遇到的问题

### 问题 1: Dry-run 实现不完整

**现象**: `--dry-run` 标志只过滤掉写工具，但没有真正的"模拟执行"

**根因**:
- 初期认为"不调用 API"即可满足需求
- 实际使用中发现用户需要预览订单参数是否正确

**解决方案**:
- 短期：在 CLI 输出工具名称和参数 JSON
- 长期：在工具 handler 内检查 `config.readOnly`，返回模拟结果

**学习**:
- Dry-run 应该模拟完整的执行流程，而非简单地跳过
- 需求理解要深入到用户实际使用场景

### 问题 2: CLI 命令路由复杂度

**现象**: CLI 入口文件超过 700 行，难以维护

**根因**:
- 所有命令逻辑集中在一个文件
- 参数解析、配置加载、工具调用混在一起

**解决方案**:
- 短期：添加注释分隔不同功能模块
- 长期：拆分为多个文件（`cmd-market.ts`, `cmd-orders.ts` 等）

**学习**:
- 即使是简单项目，也要保持模块化
- 超过 500 行的文件应该考虑拆分

### 问题 3: 合约网格参数复杂

**现象**: `buOrderDataJson` 参数有 10+ 字段，用户容易搞错

**根因**:
- Pionex API 设计复杂（趋势、杠杆、投资额等多维参数）
- 仅靠 JSON 字符串传递参数不够友好

**解决方案**:
- 引入 JSON Schema 验证
- 导出字段列表常量（`CREATE_FUTURES_GRID_ORDER_DATA_KEYS`）
- 提供详细的错误消息

**结果**:
- ✅ 验证准确，用户反馈错误清晰
- ⚠️ 仍然需要用户理解合约网格概念

**学习**:
- 复杂参数需要配合文档和示例
- 错误消息应该包含可操作的修复建议

---

## 代码质量评估

### 优点

1. **架构清晰**: Core、CLI、MCP 三层分离，职责明确
2. **类型安全**: 全部使用 TypeScript，接口定义完整
3. **错误处理**: 统一的错误模型（`ConfigError`, `PionexApiError`）
4. **可扩展**: 工具注册表设计支持轻松添加新工具

### 需要改进

1. **代码复用**: CLI 入口文件有重复逻辑，可抽取通用函数
2. **文档注释**: 部分函数缺少 JSDoc，降低可读性
3. **测试覆盖**: 完全依赖手动测试，风险较高
4. **日志系统**: 仅在错误时输出，调试困难

### 技术债

1. **Dry-run 逻辑不完整** - 优先级：P1
2. **CLI 入口文件过大** - 优先级：P2
3. **无自动化测试** - 优先级：P1
4. **无日志系统** - 优先级：P3

---

## 性能与稳定性

### 性能表现

- CLI 命令响应时间：< 1s（无网络延迟）
- MCP 工具调用延迟：< 500ms（取决于 Pionex API）
- 构建时间：< 10s（全量构建）

**评估**: 性能满足需求，无明显瓶颈

### 稳定性问题

1. **API 错误处理不完善** - 部分错误码未转换为友好消息
2. **时间戳同步问题** - 客户端时间不准可能导致签名失败
3. **限流处理缺失** - API 返回 429 时无重试机制

---

## 用户反馈

### 正面反馈

- ✅ 安装流程简单（`npm install -g` + `onboard` + `setup`）
- ✅ MCP 工具在 Cursor 中运行稳定
- ✅ Bot 工具支持合约网格，满足高级用户需求

### 负面反馈

- ❌ 缺少 Skills 文档，AI 不知道如何调用工具
- ❌ 错误消息有时不够清晰（如签名失败）
- ❌ 没有示例脚本，新用户学习成本高

### 改进建议

1. 尽快补充 Skills 文档（特别是 `pionex-trade` 的风控流程）
2. 优化错误消息，增加可操作的修复建议
3. 提供示例脚本（如监控价格、自动下单）

---

## 度量数据

### 代码规模

| 模块 | 新增行数 | 修改行数 | 删除行数 |
|------|---------|---------|---------|
| core | 800 | 50 | 10 |
| cli | 700 | 100 | 20 |
| mcp | 50 | 50 | 5 |
| 文档 | 300 | 200 | 0 |
| **总计** | **1850** | **400** | **35** |

### 工时统计

| 阶段 | 预计工时 | 实际工时 | 偏差 |
|------|---------|---------|------|
| Core 完善 | 8.5h | 10.5h | +23% |
| CLI 实现 | 14h | 18h | +29% |
| MCP 完善 | 6h | 6h | 0% |
| 文档更新 | 4h | 4h | 0% |
| 测试 | 12h | 0h | -100% |
| Skills 创建 | 9h | 0h | -100% |
| **总计** | **53.5h** | **38.5h** | **-28%** |

**分析**: 实际完成的部分超时 20%，未完成的部分（测试、Skills）被延后

### 提交统计

- 总提交数: 15 commits
- 主要提交:
  - `add bot tools and schemas` - 最大提交，400+ 行
  - `add CLI command routing` - CLI 核心功能
  - `add fillsbyorderid and booktickers` - 工具补充

---

## 经验教训

### 做得好的地方

1. **架构设计扎实** - 三层分离使得 CLI 和 MCP 复用代码简单
2. **JSON Schema 验证** - 提升了复杂参数的用户体验
3. **模块化工具系统** - 新增工具非常容易，不影响现有代码

### 需要改进的地方

1. **测试优先级低** - 应该在功能完成后立即补充测试
2. **文档滞后** - Skills 应该与功能同步完成
3. **技术债管理** - Dry-run 问题应该在发现时立即修复

### 对未来迭代的建议

1. **TDD 实践** - 先写测试，再写实现，避免技术债累积
2. **文档驱动开发** - Skills 文档应该在开发前完成，作为验收标准
3. **小步快跑** - 每完成一个功能就发布，避免大批量合并
4. **代码审查** - 引入 PR review 流程，提升代码质量

---

## 下一步行动

### 立即行动（本周内）

1. **补充 Skills 文档** - `pionex-market`, `pionex-portfolio`, `pionex-trade`
2. **完善 dry-run 逻辑** - 在工具 handler 内实现模拟执行
3. **优化错误消息** - 根据错误码提供修复建议

### 短期计划（2 周内）

1. **添加单元测试** - 覆盖核心逻辑（签名、参数解析、工具注册）
2. **拆分 CLI 入口文件** - 模块化命令处理
3. **添加示例脚本** - 帮助用户快速上手

### 长期规划（1 个月内）

1. **限流处理** - 检测 429 错误并重试
2. **日志系统** - 支持 `DEBUG=pionex:*` 环境变量
3. **集成测试** - 完整用户流程自动化测试
4. **性能优化** - 如需要（当前性能足够）

---

## 附录

### 关键文件清单

**新增文件:**
- `packages/core/src/tools/bot.ts`
- `packages/core/src/schemas/futures-grid-create.ts`

**主要修改文件:**
- `packages/cli/src/index.ts` (+700 行)
- `packages/core/src/tools/market.ts` (+150 行)
- `packages/core/src/tools/orders.ts` (+100 行)
- `packages/mcp/src/server.ts` (+50 行)

### 参考链接

- Pionex API 文档: https://pionex-doc.gitbook.io/api-zh-hans/
- MCP SDK 文档: https://github.com/modelcontextprotocol/sdk
- Git 提交历史: 查看 `git log --since="2026-03-17" --until="2026-03-20"`

---

**复盘完成日期**: 2026-03-26
**复盘人**: Dev Team
