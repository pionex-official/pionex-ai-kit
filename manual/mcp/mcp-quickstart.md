# MCP Quickstart

The Pionex Trade MCP Server lets AI clients (Cursor, Claude Desktop, VS Code, etc.) directly call Pionex exchange functions for market data, account queries, and order management.

### Prerequisites

* Node.js >= 18

### Installation

#### 1. Install the CLI

```bash
npm install -g @pionex/pionex-ai-kit
```

#### 2. Configure API Credentials

Run the interactive wizard and enter your Pionex API Key and Secret:

```bash
pionex-ai-kit onboard
```

Credentials are saved to `~/.pionex/config.toml` with support for multiple profiles.

> You can create an API Key at [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api).
>
> [API Key Guide](https://www.pionex.com/docs/api-docs/references/api-key-guide)

> If you only need market data (no trading or balance queries), you can skip this step.

#### 3. Register the MCP Server with Your AI Client

Pick the client you are using and run the corresponding command:

```bash
# Cursor
pionex-ai-kit setup --mcp=pionex-trade-mcp --client cursor

# Claude Desktop
pionex-ai-kit setup --mcp=pionex-trade-mcp --client claude-desktop

# Claude Code
pionex-ai-kit setup --mcp=pionex-trade-mcp --client claude-code

# VS Code
pionex-ai-kit setup --mcp=pionex-trade-mcp --client vscode

# Windsurf
pionex-ai-kit setup --mcp=pionex-trade-mcp --client windsurf

# OpenClaw
pionex-ai-kit setup --mcp=pionex-trade-mcp --client openclaw
```

#### 4. Restart Your Client

After setup, **restart your AI client** for the MCP Server to take effect.

### Verify the Installation

Type the following prompt in your AI client:

> "Use the Pionex tools to show the order book depth for BTC_USDT."

If the agent successfully returns the BTC_USDT order book, MCP is installed correctly.

### Next Steps

* See the [MCP User Guide](mcp-guides.md) for full features and detailed configuration
