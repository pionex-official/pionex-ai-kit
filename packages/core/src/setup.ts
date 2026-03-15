import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execFileSync } from "node:child_process";
import { configFilePath } from "./config/toml.js";

export type ClientId = "claude-desktop" | "cursor" | "windsurf" | "vscode" | "claude-code" | "open_claw";

const CLIENT_NAMES: Record<ClientId, string> = {
  "claude-desktop": "Claude Desktop",
  cursor: "Cursor",
  windsurf: "Windsurf",
  vscode: "VS Code",
  "claude-code": "Claude Code CLI",
  open_claw: "OpenClaw (mcporter)",
};

export const SUPPORTED_CLIENTS = Object.keys(CLIENT_NAMES) as ClientId[];

function appData(): string {
  return process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
}

const CLAUDE_CONFIG_FILE = "claude_desktop_config.json";

function findMsStoreClaudePath(): string | null {
  const localAppData = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
  const packagesDir = path.join(localAppData, "Packages");
  try {
    const entries = fs.readdirSync(packagesDir);
    const claudePkg = entries.find((e) => e.startsWith("Claude_"));
    if (claudePkg) {
      const configPath = path.join(
        packagesDir,
        claudePkg,
        "LocalCache",
        "Roaming",
        "Claude",
        CLAUDE_CONFIG_FILE,
      );
      if (fs.existsSync(configPath) || fs.existsSync(path.dirname(configPath))) {
        return configPath;
      }
    }
  } catch {
    // ignore missing or unreadable Packages dir
  }
  return null;
}

export function getConfigPath(client: ClientId): string | null {
  const home = os.homedir();
  const platform = process.platform;
  switch (client) {
    case "claude-desktop":
      if (platform === "win32") {
        return findMsStoreClaudePath() ?? path.join(appData(), "Claude", CLAUDE_CONFIG_FILE);
      }
      if (platform === "darwin") {
        return path.join(home, "Library", "Application Support", "Claude", CLAUDE_CONFIG_FILE);
      }
      return path.join(process.env.XDG_CONFIG_HOME ?? path.join(home, ".config"), "Claude", CLAUDE_CONFIG_FILE);
    case "cursor":
      return path.join(home, ".cursor", "mcp.json");
    case "windsurf":
      return path.join(home, ".codeium", "windsurf", "mcp_config.json");
    case "vscode":
      return path.join(process.cwd(), ".mcp.json");
    case "claude-code":
      return null;
    case "open_claw":
      return path.join(home, ".openclaw", "workspace", "config", "mcporter.json");
  }
}

const NPX_PACKAGE = "@pionex/pionex-trade-mcp";

function buildEntry(client: ClientId): Record<string, unknown> {
  if (client === "vscode") {
    return { type: "stdio", command: "pionex-trade-mcp" };
  }
  return { command: "npx", args: ["-y", NPX_PACKAGE] };
}

function mergeJsonConfig(
  configPath: string,
  serverName: string,
  entry: Record<string, unknown>
): void {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let data: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf-8");
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new Error(`Failed to parse existing config at ${configPath}`);
    }
  }

  if (typeof data.mcpServers !== "object" || data.mcpServers === null) {
    data.mcpServers = {};
  }
  (data.mcpServers as Record<string, unknown>)[serverName] = entry;

  fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export interface SetupOptions {
  client: ClientId;
}

export function runSetup(options: SetupOptions): void {
  const { client } = options;
  const name = CLIENT_NAMES[client];
  const serverName = "pionex-trade-mcp";

  if (client === "claude-code") {
    const claudeArgs = [
      "mcp",
      "add",
      "--transport",
      "stdio",
      serverName,
      "--",
      "pionex-trade-mcp",
    ];
    process.stdout.write(`Running: claude ${claudeArgs.join(" ")}\n`);
    execFileSync("claude", claudeArgs, { stdio: "inherit" });
    process.stdout.write(`✓ Configured ${name}\n`);
    return;
  }

  const configPath = getConfigPath(client);
  if (!configPath) {
    throw new Error(`${name} is not supported on this platform`);
  }

  const entry = buildEntry(client);
  mergeJsonConfig(configPath, serverName, entry);
  process.stdout.write(
    `✓ Configured ${name}\n  ${configPath}\n  Restart ${name} to apply changes.\n`
  );
}

export function printSetupUsage(): void {
  process.stdout.write(
    `Usage: pionex-trade-mcp setup --client <client>\n\n` +
      `Clients:\n` +
      SUPPORTED_CLIENTS.map((id) => `  ${id.padEnd(16)} ${CLIENT_NAMES[id]}`).join("\n") +
      `\n\nCredentials are read from ${configFilePath()}. Run "pionex-ai-kit config init" (from pionex-ai-kit) first.\n`
  );
}
