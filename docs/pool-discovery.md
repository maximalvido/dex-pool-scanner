# Pool Discovery

The pool discovery system uses a hybrid approach combining The Graph subgraphs with local caching for fast startup and efficient updates.

## How It Works

1. **Cache Check**: On startup, checks for cached pools. If cache exists and is fresh (within configured `cacheRefreshMinutes`), returns cached data immediately.

2. **Subgraph Fetching**: If cache is stale or missing, fetches pools from The Graph subgraphs for all enabled protocols configured in `protocols.json`.

3. **Filtering**: Pools are filtered by:
   - Minimum liquidity threshold (`minLiquidityUSD`)
   - Token whitelist (if configured)
   - Maximum pools per protocol (`maxPoolsPerProtocol`)

4. **Deduplication**: Removes duplicate pools (same address across multiple protocols).

5. **Caching**: Saves discovered pools to local cache file (`pools-cache.json`) for next startup.

## Configuration

Discovery behavior is controlled by the `discovery` section in `protocols.json`:

- `minLiquidityUSD`: Minimum liquidity in USD to include a pool
- `cacheRefreshMinutes`: How long cached data is considered fresh
- `maxPoolsPerProtocol`: Maximum number of pools to fetch per protocol

## Cache Management

- Cache file: `pools-cache.json` (default location)
- Automatic refresh when cache is stale
- Manual refresh via `forceRefresh()` method
- Cache cleared on `clearCache: true` option
