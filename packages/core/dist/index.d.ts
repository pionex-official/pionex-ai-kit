export { stringify as tomlStringify } from 'smol-toml';

interface PionexProfile {
    api_key?: string;
    secret_key?: string;
    base_url?: string;
}
interface PionexTomlConfig {
    default_profile?: string;
    profiles: Record<string, PionexProfile>;
}
/** Fixed path: ~/.pionex/config.toml */
declare function configFilePath(): string;
declare function readFullConfig(): PionexTomlConfig;
declare function readTomlProfile(profileName?: string): PionexProfile;
declare function writeFullConfig(config: PionexTomlConfig): void;

type ClientId = "claude-desktop" | "cursor" | "windsurf" | "vscode" | "claude-code" | "open_claw";
declare const SUPPORTED_CLIENTS: ClientId[];
declare function getConfigPath(client: ClientId): string | null;
interface SetupOptions {
    client: ClientId;
}
declare function runSetup(options: SetupOptions): void;
declare function printSetupUsage(): void;

export { type ClientId, type PionexProfile, type PionexTomlConfig, SUPPORTED_CLIENTS, type SetupOptions, configFilePath, getConfigPath, printSetupUsage, readFullConfig, readTomlProfile, runSetup, writeFullConfig };
