// src/config/toml.ts
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { parse, stringify } from "smol-toml";
function configFilePath() {
  return join(homedir(), ".pionex", "config.toml");
}
function readFullConfig() {
  const path2 = configFilePath();
  if (!existsSync(path2)) return { profiles: {} };
  const raw = readFileSync(path2, "utf-8");
  return parse(raw);
}
function readTomlProfile(profileName) {
  const config = readFullConfig();
  const name = profileName ?? config.default_profile ?? "default";
  return config.profiles?.[name] ?? {};
}
function writeFullConfig(config) {
  const path2 = configFilePath();
  const dir = dirname(path2);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path2, stringify(config), "utf-8");
}

// src/setup.ts
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFileSync } from "child_process";
var CLIENT_NAMES = {
  "claude-desktop": "Claude Desktop",
  cursor: "Cursor",
  windsurf: "Windsurf",
  vscode: "VS Code",
  "claude-code": "Claude Code CLI",
  open_claw: "OpenClaw (mcporter)"
};
var SUPPORTED_CLIENTS = Object.keys(CLIENT_NAMES);
function appData() {
  return process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
}
var CLAUDE_CONFIG_FILE = "claude_desktop_config.json";
function findMsStoreClaudePath() {
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
        CLAUDE_CONFIG_FILE
      );
      if (fs.existsSync(configPath) || fs.existsSync(path.dirname(configPath))) {
        return configPath;
      }
    }
  } catch {
  }
  return null;
}
function getConfigPath(client) {
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
var NPX_PACKAGE = "pionex-trade-mcp";
function buildEntry(client) {
  if (client === "vscode") {
    return { type: "stdio", command: "pionex-trade-mcp" };
  }
  return { command: "npx", args: ["-y", NPX_PACKAGE] };
}
function mergeJsonConfig(configPath, serverName, entry) {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  let data = {};
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf-8");
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`Failed to parse existing config at ${configPath}`);
    }
  }
  if (typeof data.mcpServers !== "object" || data.mcpServers === null) {
    data.mcpServers = {};
  }
  data.mcpServers[serverName] = entry;
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
function runSetup(options) {
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
      "pionex-trade-mcp"
    ];
    process.stdout.write(`Running: claude ${claudeArgs.join(" ")}
`);
    execFileSync("claude", claudeArgs, { stdio: "inherit" });
    process.stdout.write(`\u2713 Configured ${name}
`);
    return;
  }
  const configPath = getConfigPath(client);
  if (!configPath) {
    throw new Error(`${name} is not supported on this platform`);
  }
  const entry = buildEntry(client);
  mergeJsonConfig(configPath, serverName, entry);
  process.stdout.write(
    `\u2713 Configured ${name}
  ${configPath}
  Restart ${name} to apply changes.
`
  );
}
function printSetupUsage() {
  process.stdout.write(
    `Usage: pionex-trade-mcp setup --client <client>

Clients:
` + SUPPORTED_CLIENTS.map((id) => `  ${id.padEnd(16)} ${CLIENT_NAMES[id]}`).join("\n") + `

Credentials are read from ${configFilePath()}. Run "pionex-ai-kit config init" (from pionex-ai-kit) first.
`
  );
}
export {
  SUPPORTED_CLIENTS,
  configFilePath,
  getConfigPath,
  printSetupUsage,
  readFullConfig,
  readTomlProfile,
  runSetup,
  stringify as tomlStringify,
  writeFullConfig
};
//# sourceMappingURL=index.js.map