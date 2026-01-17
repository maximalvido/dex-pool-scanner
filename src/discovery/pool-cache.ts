import * as fs from 'fs/promises';
import { CachedPool, PoolCacheData } from '../types/index';
import { log, logError } from '../utils/logger';

export class PoolCache {
  private cachePath: string;
  private maxAgeMs: number;

  constructor(cachePath: string = './pools-cache.json', maxAgeMinutes: number = 60) {
    this.cachePath = cachePath;
    this.maxAgeMs = maxAgeMinutes * 60 * 1000;
  }

  async load(): Promise<CachedPool[]> {
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8');
      const cacheData: PoolCacheData = JSON.parse(data);

      log(`Loaded ${cacheData.pools.length} pools from cache (last update: ${cacheData.lastUpdate})`);
      return cacheData.pools;
    } catch (error) {
      log('No cache file found or error reading cache, will fetch fresh data');
      return [];
    }
  }

  async save(pools: CachedPool[]): Promise<void> {
    const cacheData: PoolCacheData = {
      lastUpdate: new Date().toISOString(),
      pools
    };

    try {
      await fs.writeFile(this.cachePath, JSON.stringify(cacheData, null, 2), 'utf-8');
      log(`Saved ${pools.length} pools to cache`);
    } catch (error) {
      logError('Error saving pool cache:', error);
    }
  }

  async isStale(): Promise<boolean> {
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8');
      const cacheData: PoolCacheData = JSON.parse(data);

      const lastUpdate = new Date(cacheData.lastUpdate);
      const age = Date.now() - lastUpdate.getTime();

      const isStale = age > this.maxAgeMs;
      if (isStale) {
        log(`Cache is stale (${Math.round(age / 60000)} minutes old, max ${this.maxAgeMs / 60000} minutes)`);
      }

      return isStale;
    } catch (error) {
      return true;
    }
  }

  async getAgeMinutes(): Promise<number | null> {
    try {
      const data = await fs.readFile(this.cachePath, 'utf-8');
      const cacheData: PoolCacheData = JSON.parse(data);

      const lastUpdate = new Date(cacheData.lastUpdate);
      const ageMs = Date.now() - lastUpdate.getTime();

      return Math.round(ageMs / 60000);
    } catch (error) {
      return null;
    }
  }

  async clear(): Promise<void> {
    try {
      await fs.unlink(this.cachePath);
      log('Cache cleared');
    } catch (error) {
    }
  }

  async getPoolsByProtocol(protocolId: string): Promise<CachedPool[]> {
    const pools = await this.load();
    return pools.filter(pool => pool.protocol === protocolId);
  }

  async getPoolCountByProtocol(): Promise<Record<string, number>> {
    const pools = await this.load();
    const counts: Record<string, number> = {};

    pools.forEach(pool => {
      counts[pool.protocol] = (counts[pool.protocol] || 0) + 1;
    });

    return counts;
  }
}
