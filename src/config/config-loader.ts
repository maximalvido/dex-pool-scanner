import * as fs from 'fs/promises';
import * as path from 'path';

export interface ProtocolConfig {
  name: string;
  factory: string;
  subgraphId: string;
  enabled: boolean;
  poolType?: string;
}

export interface DiscoveryConfig {
  minLiquidityUSD: number;
  cacheRefreshMinutes: number;
  maxPoolsPerProtocol: number;
}

export interface ProtocolConfigData {
  protocols: Record<string, ProtocolConfig>;
  discovery: DiscoveryConfig;
}

let isInitialized = false;
let configData: ProtocolConfigData | null = null;

export function isConfigInitialized(): boolean {
  return isInitialized;
}

export function getConfig(): ProtocolConfigData {
  if (!isInitialized || !configData) {
    throw new Error(
      'dex-pool-scanner has not been initialized. Please call init() first.\n' +
      'Example: import { init } from "dex-pool-scanner"; init({ configPath: "./protocols.json" });'
    );
  }
  return configData;
}

function validateConfig(data: unknown): ProtocolConfigData {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Configuration must be an object');
  }

  const obj = data as Record<string, unknown>;

  if (!obj.protocols || typeof obj.protocols !== 'object' || Array.isArray(obj.protocols)) {
    throw new Error('Configuration must have a "protocols" object');
  }

  const protocols: Record<string, ProtocolConfig> = {};
  const protocolsObj = obj.protocols as Record<string, unknown>;

  for (const [protocolId, protocolData] of Object.entries(protocolsObj)) {
    if (typeof protocolData !== 'object' || protocolData === null || Array.isArray(protocolData)) {
      throw new Error(`Protocol "${protocolId}" must be an object`);
    }

    const proto = protocolData as Record<string, unknown>;

    if (typeof proto.name !== 'string' || !proto.name) {
      throw new Error(`Protocol "${protocolId}" must have a non-empty "name" string`);
    }

    if (typeof proto.factory !== 'string' || !/^0x[a-fA-F0-9]{40}$/i.test(proto.factory)) {
      throw new Error(`Protocol "${protocolId}" must have a valid "factory" address (0x followed by 40 hex chars)`);
    }

    if (typeof proto.subgraphId !== 'string' || !proto.subgraphId) {
      throw new Error(`Protocol "${protocolId}" must have a non-empty "subgraphId" string`);
    }

    if (typeof proto.enabled !== 'boolean') {
      throw new Error(`Protocol "${protocolId}" must have a boolean "enabled" field`);
    }

    if (proto.poolType !== undefined && typeof proto.poolType !== 'string') {
      throw new Error(`Protocol "${protocolId}" poolType must be a string if provided`);
    }

    protocols[protocolId] = {
      name: proto.name,
      factory: proto.factory.toLowerCase(),
      subgraphId: proto.subgraphId,
      enabled: proto.enabled,
      poolType: proto.poolType || 'UniswapV3'
    };
  }

  if (!obj.discovery || typeof obj.discovery !== 'object' || Array.isArray(obj.discovery)) {
    throw new Error('Configuration must have a "discovery" object');
  }

  const discovery = obj.discovery as Record<string, unknown>;

  if (typeof discovery.minLiquidityUSD !== 'number' || discovery.minLiquidityUSD < 0) {
    throw new Error('discovery.minLiquidityUSD must be a non-negative number');
  }

  if (typeof discovery.cacheRefreshMinutes !== 'number' || discovery.cacheRefreshMinutes < 1) {
    throw new Error('discovery.cacheRefreshMinutes must be a number >= 1');
  }

  if (typeof discovery.maxPoolsPerProtocol !== 'number' || discovery.maxPoolsPerProtocol < 1) {
    throw new Error('discovery.maxPoolsPerProtocol must be a number >= 1');
  }

  return {
    protocols,
    discovery: {
      minLiquidityUSD: discovery.minLiquidityUSD,
      cacheRefreshMinutes: discovery.cacheRefreshMinutes,
      maxPoolsPerProtocol: discovery.maxPoolsPerProtocol
    }
  };
}

export async function loadConfigFromFile(configPath: string): Promise<ProtocolConfigData> {
  try {
    const resolvedPath = path.isAbsolute(configPath)
      ? configPath
      : path.resolve(process.cwd(), configPath);

    const fileContent = await fs.readFile(resolvedPath, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    return validateConfig(jsonData);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in configuration file "${configPath}": ${error.message}`);
    }
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Configuration file not found: "${configPath}"`);
    }
    throw error;
  }
}

export interface InitOptions {
  configPath?: string;
  config?: ProtocolConfigData;
}

export async function initialize(options: InitOptions = {}): Promise<void> {
  if (isInitialized) {
    throw new Error(
      'dex-pool-scanner has already been initialized. ' +
      'Re-initialization is not allowed. Please restart your application if you need to change configuration.'
    );
  }

  let loadedConfig: ProtocolConfigData;

  if (options.config) {
    loadedConfig = validateConfig(options.config);
  } else if (options.configPath) {
    loadedConfig = await loadConfigFromFile(options.configPath);
  } else {
    const defaultPath = path.resolve(process.cwd(), 'protocols.json');
    loadedConfig = await loadConfigFromFile(defaultPath);
  }

  const enabledProtocols = Object.entries(loadedConfig.protocols).filter(
    ([_, config]) => config.enabled
  );

  if (enabledProtocols.length === 0) {
    throw new Error('At least one protocol must be enabled in the configuration');
  }

  configData = loadedConfig;
  isInitialized = true;
}

export function reset(): void {
  isInitialized = false;
  configData = null;
}
