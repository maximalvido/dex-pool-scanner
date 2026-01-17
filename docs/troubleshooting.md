# Troubleshooting

## Common Issues

### No pools discovered

- **Check protocol configuration**: Ensure protocols are enabled in `protocols.json`
- **Verify subgraph ID**: Confirm subgraph IDs are correct for your network
- **Check API key**: Ensure `THE_GRAPH_API_KEY` is set correctly
- **Liquidity threshold**: Lower `minLiquidityUSD` if pools are filtered out

### Price updates not received

- **RPC connection**: Verify `RPC_URL` is a valid WebSocket URL
- **Pool subscriptions**: Check logs (with `ENABLE_LOG=true`) to confirm subscriptions
- **Network issues**: Ensure RPC provider supports `eth_subscribe` for logs

### Cache issues

- **Stale cache**: Use `clearCache: true` in `scanner.start()` to force refresh
- **Cache location**: Default is `./pools-cache.json` in working directory
- **Manual clear**: Delete `pools-cache.json` file

### Rate limiting

- Scanner automatically handles rate limits with exponential backoff
- Wait periods: 60s cooldown, then 5-minute wait after max attempts
- Check RPC provider limits and upgrade plan if needed

### Configuration errors

- **JSON validation**: Ensure `protocols.json` matches schema
- **Missing fields**: All required protocol fields must be present
- **Invalid addresses**: Factory addresses must be checksummed hex (0x followed by 40 hex chars)
