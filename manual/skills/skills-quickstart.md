# Skills Quickstart

Pionex Skills are high-level behavioral playbooks for AI agents, enabling them to safely perform market data queries, balance lookups, and spot trading operations via the `pionex-trade-cli` command line.

### Prerequisites

* Node.js >= 18

### Installation

#### 1. Install the CLI

```bash
npm install -g @pionex/pionex-ai-kit
```

This installs both `pionex-trade-cli` and `pionex-ai-kit` commands.

#### 2. Configure API Credentials

```bash
pionex-ai-kit onboard
```

Enter your Pionex API Key and Secret when prompted. Credentials are saved to `~/.pionex/config.toml`.

> You can create an API Key at [https://www.pionex.com/my-account/api](https://www.pionex.com/my-account/api).
>
> [API Key Guide](https://www.pionex.com/docs/api-docs/references/api-key-guide)

> If you only need market data, you can skip this step.

#### 3. Install Skills

```bash
npx skills add pionex-official/pionex-skills
```

#### 4. Verify the Installation

```bash
# Test market data (no API key needed)
pionex-trade-cli market tickers --symbol BTC_USDT

# Test account query (API key required)
pionex-trade-cli account balance
```

### Verify Skills Are Working

Type the following prompt in your AI client:

> "Use the Pionex skills to show the order book depth 5 for BTC_USDT."

If the agent successfully calls `pionex-trade-cli` and returns order book data, Skills are installed correctly.

### Next Steps

* See the [Skills User Guide](skills-guides.md) for full skill features and usage details
