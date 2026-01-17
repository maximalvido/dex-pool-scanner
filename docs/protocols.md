# Supported Protocols

## Uniswap V3

Currently supported protocol for pool discovery and price tracking.

### How Price Tracking Works

1. **Event Subscription**: Scanner subscribes to `Swap` events from discovered pools via WebSocket RPC.

2. **Event Parsing**: Each swap event contains:
   - `sqrtPriceX96`: Square root of price in Q96 fixed-point format
   - `amount0`, `amount1`: Token amounts swapped
   - `liquidity`: Current pool liquidity
   - `tick`: Current price tick

3. **Price Calculation**: 
   - Converts `sqrtPriceX96` to actual price: `price = (sqrtPriceX96 / 2^96)^2`
   - Adjusts for token decimals to get human-readable prices
   - Calculates both directions: token0 price in token1, and token1 price in token0

4. **Price Updates**: When a swap occurs:
   - New price is calculated from the event
   - Compared with previous price (if available)
   - `onPriceChange` callback is triggered with pool, new price, and old price

### Protocol Configuration

Configure Uniswap V3 in `protocols.json`:

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
  }
}
```

### Adding New Protocols

To add support for new protocols:

1. Implement `BaseLiquidityPool` interface in `src/liquidity-pools/forks/`
2. Register in `liquidity-pools.factory.ts`
3. Set `poolType` in protocol configuration
