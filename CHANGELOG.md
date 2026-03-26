[English](CHANGELOG.md) | [中文](CHANGELOG.zh-CN.md)

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Changed

- Align Pionex Bot “Futures Grid” (create/adjust/reduce) tool/CLI contracts with `openapi_bot.yaml`:
  - Standardized MCP tool naming to `pionex_bot_futures_grid_{method}`
  - Renamed CLI subcommand `adjust` -> `adjust_params`
  - Removed/forbade `openPrice` and `keyId` from create/adjust/reduce inputs; unknown keys now error
- Updated docs/skills guidance so agents follow the new stricter parameter rules and names.
- Added missing endpoints: `pionex_market_get_book_tickers` (public market best bid/ask) and `pionex_orders_get_fills_by_order_id` (signed order fills by `symbol` + `orderId`).
- BREAKING: CLI binary renamed — `pionex` has been fully replaced by `pionex-trade-cli`.
- BREAKING: Bot CLI routing — use `pionex-trade-cli bot futures_grid <command>` (e.g. `create`) instead of `pionex-trade-cli bot <command>`.

