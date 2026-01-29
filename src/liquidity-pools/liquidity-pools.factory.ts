import { BaseLiquidityPool } from './liquidity-pool.js';
import { UniswapV3 } from './forks/uniswapv3.js';
import { UniswapV2 } from './forks/uniswapv2.js';

export function instantiateLiquidityPool(
  poolType: string,
  contractAddress: string,
  token0Decimals: number,
  token1Decimals: number
): BaseLiquidityPool {
  switch (poolType) {
    case 'UniswapV3':
      return new UniswapV3(contractAddress, token0Decimals, token1Decimals);
    case 'UniswapV2':
      return new UniswapV2(contractAddress, token0Decimals, token1Decimals);
    default:
      throw new Error(`Unsupported DEX type: ${poolType}`);
  }
}