export type Protocol = string;

export interface CachedPool {
  address: string;
  protocol: Protocol;
  token0: string;
  token0Symbol: string;
  token0Decimals: number;
  token1: string;
  token1Symbol: string;
  token1Decimals: number;
  fee: number;
  liquidityUSD: number;
  volume24hUSD: number;
  lastSeen: string;
}

export interface PoolCacheData {
  lastUpdate: string;
  pools: CachedPool[];
}

export interface PoolPrice {
  poolAddress: string;
  token0Price: number;
  token1Price: number;
  timestamp: number;
}

export interface EVMTransaction {
  from: string;
  to: string;
  gas: string;
  gasPrice: string;
  value: string;
  input: string;
}
