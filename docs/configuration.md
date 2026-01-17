# Configuration

## protocols.json

Required configuration file defining protocols and discovery settings.

### Structure

```json
{
  "protocols": {
    "protocol-id": {
      "name": "Protocol Name",
      "factory": "0x...",
      "subgraphId": "subgraph-id",
      "enabled": true,
      "poolType": "UniswapV3"
    }
  },
  "discovery": {
    "minLiquidityUSD": 10000,
    "cacheRefreshMinutes": 60,
    "maxPoolsPerProtocol": 100
  }
}
```

### Protocol Fields

- `name`: Display name
- `factory`: Factory contract address (checksummed hex)
- `subgraphId`: The Graph subgraph ID
- `enabled`: Enable/disable this protocol
- `poolType`: Pool implementation type (default: "UniswapV3")

### Discovery Settings

- `minLiquidityUSD`: Minimum liquidity threshold (USD)
- `cacheRefreshMinutes`: Cache validity period
- `maxPoolsPerProtocol`: Maximum pools to fetch per protocol

## tokens.json (Optional)

Token whitelist for filtering pools:

```json
{
  "tokens": {
    "WETH": "0x4200000000000000000000000000000000000006",
    "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  }
}
```

If not provided, all pools are shown. Can also be passed directly to `scanner.start({ tokens: {...} })`.

## Programmatic Configuration

Both `protocols.json` and `tokens.json` can be passed directly to `scanner.start()`:

```typescript
await scanner.start({
  protocols: {
    'uniswap-v3': {
      name: 'Uniswap V3',
      factory: '0x...',
      subgraphId: '...',
      enabled: true,
      poolType: 'UniswapV3'
    }
  },
  discovery: {
    minLiquidityUSD: 10000,
    cacheRefreshMinutes: 60,
    maxPoolsPerProtocol: 100
  },
  tokens: {
    WETH: '0x...',
    USDC: '0x...'
  }
});
```

This overrides any file-based configuration.

## Environment Variables

- `THE_GRAPH_API_KEY`: Required for subgraph access
- `RPC_URL`: WebSocket RPC URL (required)
- `ENABLE_LOG`: Set to `"true"` to enable logging
