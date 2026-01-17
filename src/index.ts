import dotenv from 'dotenv';

dotenv.config();

export { initialize as init, type InitOptions } from './config/config-loader';
export { PoolDiscovery } from './discovery/pool-discovery';
export { fetchPoolsFromAllProtocols, fetchPoolsFromProtocol, deduplicatePools, filterPoolsByLiquidity } from './discovery/subgraph-client';
export { PoolCache } from './discovery/pool-cache';
export { DISCOVERY_CONFIG, getSubgraphUrl, getProtocolConfig, getEnabledProtocols, getAllProtocolConfigs } from './config/protocol-config';
export { loadTokenWhitelist, setTokenWhitelist, isWhitelistedToken, areBothTokensWhitelisted, getTokenSymbol, getTokenWhitelist, isTokenWhitelistLoaded } from './config/token-whitelist';
export type { TokenWhitelistConfig } from './config/token-whitelist';
export type { CachedPool, PoolCacheData, Protocol, PoolPrice } from './types/index';
export type { ProtocolConfig, DiscoveryConfig, ProtocolConfigData } from './config/config-loader';
export { Scanner, type PriceChangeCallback } from './rpc/index';
