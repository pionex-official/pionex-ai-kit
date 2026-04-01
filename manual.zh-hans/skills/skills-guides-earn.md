# 双币理财 Skills

`pionex-earn-dual` skill 引导 AI 智能体使用 `pionex-trade-cli earn dual` 命令在 Pionex 上完成双币理财操作。

> **注意：** `pionex-earn-dual` skill 将在 `pionex-official/pionex-skills` 仓库中提供，安装命令：
> ```bash
> npx skills add pionex-official/pionex-skills
> ```

---

### 覆盖的操作

| 操作 | 命令 | 鉴权 |
|------|------|------|
| 查询支持的交易对 | `earn dual symbols` | 否 |
| 浏览开放产品 | `earn dual open-products` | 否 |
| 查询收益率 | `earn dual prices` | 否 |
| 获取指数价格 | `earn dual index` | 否 |
| 历史交割价格 | `earn dual delivery-prices` | 否 |
| 查询我的余额 | `earn dual balances` | 是（View） |
| 查询我的订单 | `earn dual get-invests` | 是（View） |
| 投资历史 | `earn dual records` | 是（View） |
| 创建申购 | `earn dual invest` | 是（Earn） |
| 撤销申购 | `earn dual revoke-invest` | 是（Earn） |
| 提取收益 | `earn dual collect` | 是（Earn） |

---

### 典型操作流程

#### 第一步 — 发现产品

```bash
# 哪些交易对可用？
pionex-trade-cli earn dual symbols --base BTC

# BTC/USDT 看涨方向有哪些开放产品？
pionex-trade-cli earn dual open-products --base BTC --quote USDT --type UP
```

#### 第二步 — 查询当前收益率

```bash
# 查询 BTC/USDT 所有产品的收益率
pionex-trade-cli earn dual prices --base BTC --quote USDT

# 查询 BTC 实时指数价格
pionex-trade-cli earn dual index --base BTC --quote USDT
```

#### 第三步 — 查询可用余额

```bash
pionex-trade-cli earn dual balances
```

#### 第四步 — 申购（先 dry-run）

```bash
# 预览
pionex-trade-cli earn dual invest \
  --base BTC \
  --product-id BTC-USDT-260402-70000-C-USDT \
  --client-dual-id my-order-001 \
  --currency-amount 100 \
  --profit 0.0215 \
  --dry-run

# 执行
pionex-trade-cli earn dual invest \
  --base BTC \
  --product-id BTC-USDT-260402-70000-C-USDT \
  --client-dual-id my-order-001 \
  --currency-amount 100 \
  --profit 0.0215
```

#### 第五步 — 收益提取

```bash
pionex-trade-cli earn dual collect --base BTC --client-dual-id my-order-001
```

---

### 风险控制

* 申购前始终通过 `prices` 查询当前收益率 —— `profit` 值必须与接口返回匹配。
* 执行 `invest`、`revoke-invest` 或 `collect` 前先用 `--dry-run` 预览。
* 申购前通过 `balances` 确认可用余额是否充足。
* 通过 `open-products` 确认产品 `expired: false` 后再申购。
