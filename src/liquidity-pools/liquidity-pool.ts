import { UniswapV3 } from './forks/uniswapv3';

export interface EthereumLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber?: string;
  blockHash?: string;
  transactionHash?: string;
  transactionIndex?: string;
  logIndex?: string;
  removed?: boolean;
}

export interface SwapEventData {
  amount0: bigint | string;
  amount1: bigint | string;
  sqrtPriceX96: bigint | string;
  liquidity: bigint | string;
  tick: bigint | string;
  sender: string;
  recipient: string;
  price: number;
}

export interface BaseLiquidityPool {
  parseSwapEventData(log: EthereumLog): SwapEventData;
  getContractAddress(): string;
  getSwapEventSignature(): string;
  getName(): string;
}