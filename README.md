# DEX Pool Scanner

[![npm version](https://img.shields.io/npm/v/dex-pool-scanner.svg)](https://www.npmjs.com/package/dex-pool-scanner)
[![npm downloads](https://img.shields.io/npm/dm/dex-pool-scanner.svg)](https://www.npmjs.com/package/dex-pool-scanner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

Multi-protocol DEX liquidity pool scanner and real-time price tracker for EVM networks. Discovers pools from multiple DEX protocols using [The Graph](https://thegraph.com/explorer) and monitors price changes via WebSocket.

## Supported Protocols

- **UniswapV3** - Full support for pool discovery and real-time price tracking

## Installation

```bash
npm install dex-pool-scanner
```

Or using yarn:

```bash
yarn add dex-pool-scanner
```

Or using pnpm:

```bash
pnpm add dex-pool-scanner
```

## Quick Start

1. Create `protocols.json` configuration file:

```json
{
  "protocols": {
    "uniswap-v3": {
      "name": "Uniswap V3",
      "factory": "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
      "subgraphId": "43Hwfi3dJSoGpyas9VwNoDAv55yjgGrPpNSmbQZArzMG",
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

2. Set environment variables:

```bash
THE_GRAPH_API_KEY=your_api_key
RPC_URL=wss://your-rpc-url
ENABLE_LOG=true  # Optional: enable logging
```

3. Run Scanner:

```bash
# run file: examples/basic-discovery.ts
npm run example 
```

## Build on top:

```typescript
import { Scanner, CachedPool, PoolPrice } from 'dex-pool-scanner';

const onPriceChange = (pool: CachedPool, newPrice: PoolPrice, oldPrice: PoolPrice | null) => {
  // Handle price updates
  console.log(`Price update for ${pool.token0Symbol}/${pool.token1Symbol}:`, newPrice);
};

async function main() {
  const scanner = new Scanner(onPriceChange);

  /** 
   * Check configuration options
   */
  await scanner.start({ 
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    protocols: {
      'uniswap-v3': {
        name: 'Uniswap V3',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
        subgraphId: '43Hwfi3dJSoGpyas9VwNoDAv55yjgGrPpNSmbQZArzMG',
        enabled: true,
        poolType: 'UniswapV3'
      }
    },
    discovery: {
      minLiquidityUSD: 10000,
      cacheRefreshMinutes: 60,
      maxPoolsPerProtocol: 100
    }
  });

  // Keep running
  setTimeout(() => {
    console.log('\nStopping scanner...');
    scanner.stop();
    process.exit(0);
  }, 60000);
}

main().catch(console.error);
```

## Configuration

### protocols.json

Required configuration file for protocol settings:

- `protocols`: Object mapping protocol IDs to their configuration
  - `name`: Display name
  - `factory`: Factory contract address
  - `subgraphId`: The Graph subgraph ID
  - `enabled`: Enable/disable protocol
  - `poolType`: Liquidity pool type (e.g., "UniswapV3")
- `discovery`: Discovery settings
  - `minLiquidityUSD`: Minimum liquidity threshold
  - `cacheRefreshMinutes`: Cache refresh interval
  - `maxPoolsPerProtocol`: Max pools per protocol

### tokens.json (Optional)

Token whitelist for filtering pools:

```json
{
  "tokens": {
    "WETH": "0x4200000000000000000000000000000000000006",
    "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  }
}
```

If not provided, all pools will be shown.

## API

### Scanner

```typescript
const scanner = new Scanner(
  onPriceChange: (pool: CachedPool, newPrice: PoolPrice, oldPrice: PoolPrice | null) => void,
  configPath?: string  // Default: './protocols.json' (used if protocols/discovery not provided in start())
);

await scanner.start({
  clearCache?: boolean,  // Clear pool cache before starting
  tokens?: Record<string, string>,  // Token whitelist (overrides tokens.json)
  protocols?: Record<string, ProtocolConfig>,  // Protocol config (overrides configPath, must provide with discovery)
  discovery?: DiscoveryConfig  // Discovery settings (required if protocols provided)
});

scanner.stop();  // Stop monitoring
```

## Environment Variables

- `THE_GRAPH_API_KEY`: The Graph API key (required)
- `RPC_URL`: WebSocket RPC URL (required)
- `ENABLE_LOG`: Set to `"true"` to enable logging (optional)

## Documentation

- [Pool Discovery](./docs/pool-discovery.md) - How pool discovery works
- [Supported Protocols](./docs/protocols.md) - Protocol support and price tracking
- [Configuration](./docs/configuration.md) - Configuration guide
- [Troubleshooting](./docs/troubleshooting.md) - Common issues and solutions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [Maximiliano Malvido](https://github.com/maximalvido)
