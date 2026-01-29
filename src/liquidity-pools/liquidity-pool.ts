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

export interface BaseSwapEventData {
  amount0: bigint | string;
  amount1: bigint | string;
  sender: string;
  recipient: string;
  price: number;
}

export interface UniswapV2SwapEventData extends BaseSwapEventData {
  reserve0: bigint | string;
  reserve1: bigint | string;
}

export interface UniswapV3SwapEventData extends BaseSwapEventData {
  sqrtPriceX96: bigint | string;
  liquidity: bigint | string;
  tick: bigint | string;
}

export type SwapEventData = UniswapV2SwapEventData | UniswapV3SwapEventData;

export interface BaseLiquidityPool {
  parseSwapEventData(log: EthereumLog): SwapEventData;
  getContractAddress(): string;
  getEventSignatures(): string[];
  getName(): string;
  getInitialStateCall(): { address: `0x${string}`; abi: any; functionName: string; args?: any[] };
  applyInitialState(result: any): void;
  getCurrentPrice(): number;
}