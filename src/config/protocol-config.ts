import { Protocol } from '../types/index';
import { getConfig, ProtocolConfig as LoadedProtocolConfig } from './config-loader';
import { logWarn } from '../utils/logger';

export interface ProtocolConfig {
  name: string;
  factory: string;
  subgraphId?: string;
  enabled: boolean;
}

function buildSubgraphUrl(protocolId: string): string {
  const apiKey = process.env.THE_GRAPH_API_KEY;
  
  if (!apiKey) {
    logWarn(`THE_GRAPH_API_KEY not set. Please add it to your .env file.`);
    return '';
  }

  const config = getConfig();
  const protocolConfig = config.protocols[protocolId];
  
  if (!protocolConfig) {
    logWarn(`No protocol configuration found for "${protocolId}"`);
    return '';
  }

  const subgraphId = protocolConfig.subgraphId;
  if (!subgraphId) {
    logWarn(`No subgraph ID configured for ${protocolConfig.name}`);
    return '';
  }

  return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${subgraphId}`;
}

export function getProtocolConfig(protocolId: string): ProtocolConfig | undefined {
  const config = getConfig();
  const protocolConfig = config.protocols[protocolId];
  
  if (!protocolConfig) {
    return undefined;
  }

  return {
    name: protocolConfig.name,
    factory: protocolConfig.factory,
    subgraphId: protocolConfig.subgraphId,
    enabled: protocolConfig.enabled
  };
}

export function getEnabledProtocols(): string[] {
  const config = getConfig();
  return Object.entries(config.protocols)
    .filter(([_, protocolConfig]) => protocolConfig.enabled)
    .map(([protocolId, _]) => protocolId);
}

export function getSubgraphUrl(protocolId: string): string {
  return buildSubgraphUrl(protocolId);
}

export const DISCOVERY_CONFIG = {
  get minLiquidityUSD(): number {
    return getConfig().discovery.minLiquidityUSD;
  },
  get cacheRefreshMinutes(): number {
    return getConfig().discovery.cacheRefreshMinutes;
  },
  get maxPoolsPerProtocol(): number {
    return getConfig().discovery.maxPoolsPerProtocol;
  }
};

export function getAllProtocolConfigs(): Record<string, ProtocolConfig> {
  const config = getConfig();
  const result: Record<string, ProtocolConfig> = {};
  
  for (const [protocolId, protocolConfig] of Object.entries(config.protocols)) {
    result[protocolId] = {
      name: protocolConfig.name,
      factory: protocolConfig.factory,
      subgraphId: protocolConfig.subgraphId,
      enabled: protocolConfig.enabled
    };
  }
  
  return result;
}
