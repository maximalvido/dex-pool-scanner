import { Protocol, CachedPool } from '../types/index';
import { getProtocolConfig, getEnabledProtocols, DISCOVERY_CONFIG, getSubgraphUrl } from '../config/protocol-config';
import { areBothTokensWhitelisted, loadTokenWhitelist } from '../config/token-whitelist';
import { log, logError } from '../utils/logger';

const POOLS_QUERY = `
  query GetTopPools($first: Int!, $minLiquidityUSD: BigDecimal!) {
    pools(
      first: $first
      orderBy: totalValueLockedUSD
      orderDirection: desc
      where: { totalValueLockedUSD_gte: $minLiquidityUSD }
    ) {
      id
      token0 {
        id
        symbol
        decimals
      }
      token1 {
        id
        symbol
        decimals
      }
      feeTier
      totalValueLockedUSD
      volumeUSD
    }
  }
`;

interface SubgraphPool {
  id: string;
  token0: {
    id: string;
    symbol: string;
    decimals: string;
  };
  token1: {
    id: string;
    symbol: string;
    decimals: string;
  };
  feeTier: string;
  totalValueLockedUSD: string;
  volumeUSD: string;
}

interface GraphQLResponse {
  data?: {
    pools?: SubgraphPool[];
  };
  errors?: Array<{ message: string }>;
}

// Fetches pools from a protocol's The Graph subgraph, filtered by token whitelist
export async function fetchPoolsFromProtocol(protocolId: string): Promise<CachedPool[]> {
  const config = getProtocolConfig(protocolId);

  if (!config) {
    log(`Protocol "${protocolId}" not found, skipping`);
    return [];
  }

  if (!config.enabled) {
    log(`Protocol ${config.name} is disabled, skipping`);
    return [];
  }

  log(`Fetching pools from ${config.name} subgraph...`);

  try {
    const subgraphUrl = getSubgraphUrl(protocolId);
    const response = await fetch(subgraphUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',

      },
      body: JSON.stringify({
        query: POOLS_QUERY,
        variables: {
          first: DISCOVERY_CONFIG.maxPoolsPerProtocol,
          minLiquidityUSD: DISCOVERY_CONFIG.minLiquidityUSD.toString() // BigDecimal expects string
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as GraphQLResponse;

    if (data.errors) {
      logError(`GraphQL errors from ${config.name}:`, data.errors);
      return [];
    }

    const pools: SubgraphPool[] = data.data?.pools || [];

    const cachedPools: CachedPool[] = pools
      .filter(pool => areBothTokensWhitelisted(pool.token0.id, pool.token1.id))
      .map(pool => ({
        address: pool.id.toLowerCase(),
        protocol: protocolId,
        token0: pool.token0.id.toLowerCase(),
        token0Symbol: pool.token0.symbol,
        token0Decimals: parseInt(pool.token0.decimals),
        token1: pool.token1.id.toLowerCase(),
        token1Symbol: pool.token1.symbol,
        token1Decimals: parseInt(pool.token1.decimals),
        fee: parseInt(pool.feeTier),
        liquidityUSD: parseFloat(pool.totalValueLockedUSD),
        volume24hUSD: parseFloat(pool.volumeUSD),
        lastSeen: new Date().toISOString()
      }));

    log(`Found ${cachedPools.length} pools from ${config.name} (${pools.length} total, ${pools.length - cachedPools.length} filtered)`);

    return cachedPools;
  } catch (error) {
    logError(`Error fetching pools from ${config.name}:`, error);
    return [];
  }
}

export async function fetchPoolsFromAllProtocols(): Promise<CachedPool[]> {
  await loadTokenWhitelist();
  
  const protocolIds = getEnabledProtocols();

  log('---------------------------------------------------');
  log('Fetching pools from all protocols...');
  log('---------------------------------------------------');

  const results = await Promise.all(
    protocolIds.map(protocolId => fetchPoolsFromProtocol(protocolId))
  );

  const allPools = results.flat();

  log('---------------------------------------------------');
  log(`Total pools discovered: ${allPools.length}`);
  log('Breakdown by protocol:');

  const counts: Record<string, number> = {};
  allPools.forEach(pool => {
    counts[pool.protocol] = (counts[pool.protocol] || 0) + 1;
  });

  Object.entries(counts).forEach(([protocolId, count]) => {
    const config = getProtocolConfig(protocolId);
    const name = config?.name || protocolId;
    log(`  ${name}: ${count} pools`);
  });

  return allPools;
}

export function filterPoolsByLiquidity(pools: CachedPool[], minUSD: number): CachedPool[] {
  return pools.filter(pool => pool.liquidityUSD >= minUSD);
}

export function deduplicatePools(pools: CachedPool[]): CachedPool[] {
  const seen = new Set<string>();
  return pools.filter(pool => {
    if (seen.has(pool.address)) {
      return false;
    }
    seen.add(pool.address);
    return true;
  });
}
