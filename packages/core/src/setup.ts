import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execFileSync } from "node:child_process";
import { configFilePath } from "./config/toml.js";

export type ClientId = "claude-desktop" | "cursor" | "windsurf" | "vscode" | "claude-code" | "openclaw" | "codex";

const CLIENT_NAMES: Record<ClientId, string> = {
  "claude-desktop": "Claude Desktop",
  cursor: "Cursor",
  windsurf: "Windsurf",
  vscode: "VS Code",
  "claude-code": "Claude Code CLI",
  openclaw: "OpenClaw (mcporter)",
  codex: "OpenAI Codex CLI",
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
    case "openclaw":
      return path.join(home, ".openclaw", "workspace", "config", "mcporter.json");
    case "codex":
      return path.join(home, ".codex", "config.yaml");
  }
}

const NPX_PACKAGE = "@pionex/pionex-trade-mcp";

function buildEntry(client: ClientId): Record<string, unknown> {
  if (client === "vscode") {
    // VS Code MCP expects an explicit stdio transport field.
    return { type: "stdio", command: "npx", args: ["-y", NPX_PACKAGE] };
  }
  if (client === "codex") {
    return { command: "npx", args: ["-y", NPX_PACKAGE] };
  }
  // Other clients (Cursor, Claude Desktop, Windsurf, OpenClaw, etc.) use npx
  // with the scoped package name so that users do not need to manage PATH.
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

function mergeCodexYaml(configPath: string, serverName: string, entry: Record<string, unknown>): void {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Simple line-based YAML merge for the mcpServers block.
  // Codex config.yaml uses the same mcpServers schema as other MCP clients.
  const args = entry.args as string[];
  const argsYaml = args.map((a) => `        - "${a}"`).join("\n");
  const serverBlock =
    `    ${serverName}:\n` +
    `      command: "${entry.command}"\n` +
    `      args:\n` +
    argsYaml;

  if (!fs.existsSync(configPath)) {
    const content = `mcpServers:\n${serverBlock}\n`;
    fs.writeFileSync(configPath, content, "utf-8");
    return;
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  // If an entry with this server name already exists, replace it.
  const serverEntryRegex = new RegExp(
    `(    ${serverName}:\\n(?:      [^\\n]*\\n|        [^\\n]*\\n)*)`,
    "g"
  );
  if (serverEntryRegex.test(raw)) {
    fs.writeFileSync(configPath, raw.replace(serverEntryRegex, serverBlock + "\n"), "utf-8");
    return;
  }

  // Append under existing mcpServers block.
  if (raw.includes("mcpServers:")) {
    const updated = raw.replace("mcpServers:", `mcpServers:\n${serverBlock}`);
    fs.writeFileSync(configPath, updated, "utf-8");
    return;
  }

  // No mcpServers key at all — append it.
  fs.writeFileSync(configPath, raw.trimEnd() + `\nmcpServers:\n${serverBlock}\n`, "utf-8");
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
      "--scope",
      "user",
      "--transport",
      "stdio",
      serverName,
      "--",
      "npx",
      "-y",
      NPX_PACKAGE,
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
  if (client === "codex") {
    mergeCodexYaml(configPath, serverName, entry);
  } else {
    mergeJsonConfig(configPath, serverName, entry);
  }
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
