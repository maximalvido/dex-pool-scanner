import { BaseLiquidityPool } from './liquidity-pool.js';
import { UniswapV3 } from './forks/uniswapv3.js';

export function instantiateLiquidityPool(poolType: string, contractAddress: string): BaseLiquidityPool {
  switch (poolType) {
    case 'UniswapV3':
      return new UniswapV3(contractAddress);
    default:
      throw new Error(`Unsupported DEX type: ${poolType}`);
  }
}