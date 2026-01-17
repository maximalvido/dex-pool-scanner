import { PoolCache } from './pool-cache';
import { CachedPool } from '../types/index';
import { fetchPoolsFromAllProtocols, deduplicatePools } from './subgraph-client';
import { DISCOVERY_CONFIG } from '../config/protocol-config';
import { log } from '../utils/logger';

export class PoolDiscovery {
  private cache: PoolCache;

  constructor(cachePath?: string) {
    this.cache = new PoolCache(cachePath, DISCOVERY_CONFIG.cacheRefreshMinutes);
  }

  // Hybrid discovery: uses cache if fresh, otherwise fetches from subgraphs
  async discoverPools(): Promise<CachedPool[]> {
    log('='.repeat(70));
    log('POOL DISCOVERY');
    log('='.repeat(70));

    const cached = await this.cache.load();
    const isStale = await this.cache.isStale();

    if (cached.length > 0 && !isStale) {
      const ageMinutes = await this.cache.getAgeMinutes();
      log(`Using cached pools (age: ${ageMinutes} minutes)`);
      log(`   Pools loaded: ${cached.length}`);
      log('='.repeat(70));
      return cached;
    }

    if (cached.length > 0) {
      log('Cache is stale, refreshing from subgraphs...');
    } else {
      log('No cache found, fetching from subgraphs...');
    }

    let pools = await fetchPoolsFromAllProtocols();
    const uniquePools = deduplicatePools(pools);

    if (uniquePools.length !== pools.length) {
      log(`Removed ${pools.length - uniquePools.length} duplicate pools`);
    }

    await this.cache.save(uniquePools);

    log('='.repeat(70));
    log(`Discovery complete: ${uniquePools.length} pools ready`);
    log('='.repeat(70));

    return uniquePools;
  }

  async forceRefresh(): Promise<void> {
    log('Force refreshing pools from subgraphs...');
    await this.cache.clear();
  }

  async getAllPools(): Promise<CachedPool[]> {
    return this.discoverPools();
  }

  async getPoolsByProtocol(protocolId: string): Promise<CachedPool[]> {
    const allPools = await this.discoverPools();
    return allPools.filter(pool => pool.protocol === protocolId);
  }
}
