# 雙幣理財 Skills

`pionex-earn-dual` skill 引導 AI Agent 使用 `pionex-trade-cli earn dual` 命令在 Pionex 上完成雙幣理財操作。

> **注意：** `pionex-earn-dual` skill 將在 `pionex-official/pionex-skills` 儲存庫中提供，安裝指令：
> ```bash
> npx skills add pionex-official/pionex-skills
> ```

---

### 涵蓋的操作

| 操作 | 命令 | 驗證 |
|------|------|------|
| 查詢支援的交易對 | `earn dual symbols` | 否 |
| 瀏覽開放產品 | `earn dual open-products` | 否 |
| 查詢收益率 | `earn dual prices` | 否 |
| 取得指數價格 | `earn dual index` | 否 |
| 歷史交割價格 | `earn dual delivery-prices` | 否 |
| 查詢我的餘額 | `earn dual balances` | 是（`讀取`） |
| 查詢我的訂單 | `earn dual get-invests` | 是（`讀取`） |
| 投資歷史 | `earn dual records` | 是（`讀取`） |
| 建立申購 | `earn dual invest` | 是（`理財`） |
| 撤銷申購 | `earn dual revoke-invest` | 是（`理財`） |
| 提取收益 | `earn dual collect` | 是（`理財`） |

---

### 典型操作流程

#### 第一步 — 探索產品

```bash
pionex-trade-cli earn dual symbols --base BTC
pionex-trade-cli earn dual open-products --base BTC --quote USDT --type UP
```

#### 第二步 — 查詢收益率

```bash
pionex-trade-cli earn dual prices --base BTC --quote USDT
pionex-trade-cli earn dual index --base BTC --quote USDT
```

#### 第三步 — 確認餘額

```bash
pionex-trade-cli earn dual balances
```

#### 第四步 — 申購（先 dry-run）

```bash
pionex-trade-cli earn dual invest \
  --base BTC \
  --product-id BTC-USDT-260402-70000-C-USDT \
  --client-dual-id my-order-001 \
  --currency-amount 100 \
  --profit 0.0215 \
  --dry-run
```

#### 第五步 — 提取收益

```bash
pionex-trade-cli earn dual collect --base BTC --client-dual-id my-order-001
```

---

### 風險控制

* 申購前務必透過 `prices` 查詢當前收益率 —— `profit` 值必須與 API 回傳值一致。
* 執行 `invest`、`revoke-invest` 或 `collect` 前先以 `--dry-run` 預覽。
* 透過 `balances` 確認可用餘額充足。
* 透過 `open-products` 確認產品 `expired: false` 後再申購。
