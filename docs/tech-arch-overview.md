# Technical Architecture Overview

This document describes the high-level architecture design of Pionex AI Kit.

## Last Updated

**Date:** 2026-03-26

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   AI Clients                            │
│  (Cursor, Claude Desktop, Windsurf, VS Code, etc.)     │
└────────────────────┬────────────────────────────────────┘
                     │ MCP Protocol (stdio)
                     ▼
┌─────────────────────────────────────────────────────────┐
│          @pionex/pionex-trade-mcp (MCP Server)          │
│  - Implements MCP protocol (ListTools, CallTool)        │
│  - Reads credentials from ~/.pionex/config.toml         │
│  - Routes MCP calls to core tools                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              @pionex-ai/core (Core Library)             │
│  - PionexRestClient (REST API wrapper)                  │
│  - Tool system (market, account, orders, bot)           │
│  - Configuration management (TOML read/write)           │
│  - JSON Schema validation                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Pionex REST API                        │
│         https://api.pionex.com                          │
└─────────────────────────────────────────────────────────┘

                  Parallel Path: CLI

┌─────────────────────────────────────────────────────────┐
│         @pionex/pionex-ai-kit (CLI Tool)                │
│  - onboard command → writes ~/.pionex/config.toml       │
│  - setup command → writes MCP client config             │
│  - Trade commands (pionex-trade-cli) → uses core tools  │
└────────────────────┬────────────────────────────────────┘
                     │
                     └──────→ Uses @pionex-ai/core
```

## Core Design Decisions

### 1. Monorepo Structure

**Technology Choice:** pnpm workspace + npm workspaces
**Rationale:**
- Three packages share the same build toolchain (tsup, TypeScript)
- `@pionex-ai/core` is a private package, avoiding separate publishing and maintenance
- Simplifies local development and dependency management

### 2. Three-Layer Architecture

#### Layer 1: Core (`@pionex-ai/core`)
**Responsibility:** Business logic, API client, tool definitions
**Independence:** No dependency on MCP SDK or CLI frameworks

#### Layer 2a: MCP Server (`@pionex/pionex-trade-mcp`)
**Responsibility:** MCP protocol adapter
**Dependencies:** `@modelcontextprotocol/sdk`, `@pionex-ai/core`

#### Layer 2b: CLI (`@pionex/pionex-ai-kit`)
**Responsibility:** User interaction, configuration management, direct trading commands
**Dependencies:** `@pionex-ai/core`

### 3. Credential Management

**Design Principle:** Local-first, zero-trust client

**Implementation:**
- API keys stored in `~/.pionex/config.toml` (user home directory)
- MCP client configs only contain the server start command (`npx @pionex/pionex-trade-mcp`)
- Credential reading priority: Environment variables > TOML file
- MCP server reads credentials at startup, does not pass them between processes

**Security Boundary:**
```
┌────────────────────────────────────────┐
│  User space (~/.pionex/config.toml)    │ ← Credential storage
└──────────────┬─────────────────────────┘
               │
               ▼ (Read only at startup)
┌────────────────────────────────────────┐
│  MCP Server process (short-lived)      │ ← Uses credentials
└──────────────┬─────────────────────────┘
               │
               ▼ (Contains no credentials)
┌────────────────────────────────────────┐
│  MCP client config                     │ ← Safe
└────────────────────────────────────────┘
```

### 4. Module System

**Design:** Tools grouped by functional domain into modules
**Module List:** market, account, orders, bot

**Configurability:**
- Each module can be independently enabled/disabled (via configuration)
- Without authentication, non-market modules are automatically marked as `requires_auth`
- `system_get_capabilities` tool exposes module status for Agent planning

**Extensibility:**
- Adding tools: Add `ToolSpec` in `packages/core/src/tools/*.ts`
- Adding modules: Create a new file and register in the `MODULES` constant

### 5. Build System

**Tool:** tsup (based on esbuild)
**Configuration:** Independent `tsconfig.json` + `package.json` scripts per package

**Build Order:**
```bash
npm run build
  → build core (no dependencies)
  → build cli (depends on core)
  → build mcp (depends on core)
```

**Bundling Strategy:**
- `@pionex-ai/core` is bundled into cli and mcp
- Published packages are small (only include dist/)
- No node_modules needed at runtime (automatically downloaded when using `npx`)

## Technology Stack

| Layer | Technology | Version Requirement |
|-------|-----------|-------------------|
| Runtime | Node.js | ≥18 |
| Language | TypeScript | ^5.0 |
| Build | tsup | ^8.0 |
| Package Manager | pnpm | (recommended, npm compatible) |
| Protocol | MCP | SDK ^1.0 |
| Config Format | TOML | smol-toml ^1.3 |

## Dependency Strategy

### Minimal Production Dependencies Principle

**MCP Server:** Only `@modelcontextprotocol/sdk`
**CLI:** Zero external dependencies (runtime)
**Core:** `smol-toml` (lightweight TOML parser)

**Rationale:**
- Reduce supply chain risk
- Speed up `npx` installation
- Avoid dependency conflicts

### Shared Development Dependencies

All devDependencies declared in root `package.json`:
- `@types/node`, `typescript`, `tsup`
- Inherited by sub-packages, no duplicate declarations needed

## Deployment Model

### MCP Server
**Distribution:** npm (`@pionex/pionex-trade-mcp`)
**Execution:** `npx @pionex/pionex-trade-mcp` (MCP client starts via stdio)
**Lifecycle:** Started on demand, automatically exits when AI client closes

### CLI
**Distribution:** npm (`@pionex/pionex-ai-kit`)
**Installation:** `npm install -g @pionex/pionex-ai-kit`
**Execution:** User directly invokes `pionex-ai-kit` or `pionex-trade-cli`

## Extensibility Considerations

### Adding New API Endpoints
1. Add methods in `packages/core/src/client/rest-client.ts` (if new endpoint type needed)
2. Add `ToolSpec` in corresponding `packages/core/src/tools/*.ts`
3. Build, test, publish

### Adding New MCP Client Support
1. Add client type and config writing logic in `packages/core/src/setup.ts`
2. Update `SUPPORTED_CLIENTS` constant
3. Update documentation (README.md)

### Adding New Authentication Methods
1. Extend `loadConfig()` in `packages/core/src/config.ts`
2. Add new signature logic in `PionexRestClient`
3. Maintain backward compatibility with existing TOML configuration

## Non-Functional Requirements

### Performance
- No connection pooling for REST requests (short-lived sessions)
- Tool calls are synchronous blocking (MCP protocol limitation)

### Security
- Never print API keys or signatures in logs
- Error messages do not expose full request parameters

### Maintainability
- Tool definitions in one place (`packages/core/src/tools/`)
- MCP and CLI reuse the same tool definitions
- TypeScript type safety throughout the full stack
