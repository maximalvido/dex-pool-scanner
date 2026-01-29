import { CachedPool, PoolPrice, Scanner } from '../src/index';

const onPriceChange = (pool: CachedPool, newPrice: PoolPrice, oldPrice: PoolPrice | null) => {
  const change = oldPrice
    ? ((newPrice.token0Price - oldPrice.token0Price) / oldPrice.token0Price * 100).toFixed(4)
    : 'N/A';

  console.log(`\nPrice Update: ${pool.token0Symbol}/${pool.token1Symbol} [${pool.protocol}]`);
  console.log(`   Pool: ${pool.address}`);
  console.log(`   ${pool.token0Symbol} price: ${newPrice.token0Price.toFixed(6)} ${pool.token1Symbol}`);
  console.log(`   ${pool.token1Symbol} price: ${newPrice.token1Price.toFixed(6)} ${pool.token0Symbol}`);
  if (oldPrice) {
    console.log(`   Change: ${change}%`);
  }
};

async function main() {
  const scanner = new Scanner(onPriceChange, './protocols.json');

  await scanner.start({
    protocols: {
      'uniswap-v3': {
        name: 'Uniswap V3',
        factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
        subgraphId: '43Hwfi3dJSoGpyas9VwNoDAv55yjgGrPpNSmbQZArzMG',
        enabled: true,
        poolType: 'UniswapV3'
      },
      'sushiswap-v2': {
        name: 'SushiSwap V2',
        factory: '0x2f8818d1b0f3e3e295440c1c0cddf40aaa21fa87',
        subgraphId: '7Tbc4o9M99Si1x7yenGXmsbHyMgUTPKJU1GjDdaXzXK3',
        enabled: true,
        poolType: 'UniswapV2'
      }
    },
    discovery: {
      minLiquidityUSD: 1, // Lower for testing
      cacheRefreshMinutes: 60,
      maxPoolsPerProtocol: 100
    },
    clearCache: true,
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
    }
  });

  // Keep running for 60 seconds
  setTimeout(() => {
    console.log('\nStopping scanner...');
    scanner.stop();
    process.exit(0);
  }, 60000);
}

main().catch(console.error);
