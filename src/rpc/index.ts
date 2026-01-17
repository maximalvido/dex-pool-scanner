import 'dotenv/config';
import { RPC } from './rpc';
import { initialize, getConfig, ProtocolConfig, DiscoveryConfig } from '../config/config-loader';
import { PoolDiscovery } from '../discovery/pool-discovery';
import { CachedPool, PoolPrice } from '../types';
import { BaseLiquidityPool, EthereumLog } from '../liquidity-pools/liquidity-pool';
import { instantiateLiquidityPool } from '../liquidity-pools/liquidity-pools.factory';
import { setTokenWhitelist, loadTokenWhitelist } from '../config/token-whitelist';
import { log, logError, logWarn } from '../utils/logger';

const RPC_URL = process.env.RPC_URL as string;
const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 60000;
const CONNECTION_TIMEOUT = 5 * 60 * 1000;

function calculatePriceFromSqrtPriceX96(
  sqrtPriceX96: bigint,
  token0Decimals: number,
  token1Decimals: number
): { token0Price: number; token1Price: number } {
  const Q96 = 2n ** 96n;
  const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
  const price = sqrtPrice * sqrtPrice;
  const decimalAdjustment = 10 ** (token1Decimals - token0Decimals);
  const adjustedPrice = price * decimalAdjustment;
  
  return {
    token0Price: adjustedPrice,
    token1Price: 1 / adjustedPrice
  };
}

export type PriceChangeCallback = (
  pool: CachedPool,
  newPrice: PoolPrice,
  oldPrice: PoolPrice | null
) => void;

class Scanner {
  private rpc: RPC | undefined;
  private lastMessageTime = Date.now();
  private reconnectAttempts = 0;
  private isRateLimited = false;
  private pools: CachedPool[] = [];
  private liquidityPools: Map<string, BaseLiquidityPool> = new Map();
  private currentPrices: Map<string, PoolPrice> = new Map();
  private poolDiscovery?: PoolDiscovery;

  constructor(
    private onPriceChange: PriceChangeCallback,
    private configPath: string = './protocols.json'
  ) {}

  private createRPCConnection() {
    if (!RPC_URL) {
      throw new Error('RPC URL not set');
    }

    log(`[${new Date().toISOString()}] Creating WebSocket connection to ${RPC_URL.substring(0, 40)}...`);

    this.rpc = new RPC(RPC_URL, {
      onMessage: (message: any) => {
        this.lastMessageTime = Date.now();
        this.handleMessage(message);
      },
      onOpen: () => {
        this.reconnectAttempts = 0;
        this.lastMessageTime = Date.now();
        this.subscribeToPoolSwaps();
      },
      onClose: () => {
        log(`[${new Date().toISOString()}] WebSocket connection closed`);
        this.attemptReconnect();
      },
      onError: (error: any) => {
        logError(`[${new Date().toISOString()}] WebSocket error:`, error);
        if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
          logWarn(`[${new Date().toISOString()}] Rate limit detected (429). Enabling COOLDOWN mode.`);
          this.isRateLimited = true;
        }
      }
    });
  }

  private async handleMessage(message: any) {
    if (message.method === 'eth_subscription' && message.params) {
      const subscription = message.params.subscription;
      const result = message.params.result;

      if (result && result.topics) {
        this.handleLogEvent(result as EthereumLog);
      }
    }
  }

  // Parses swap events and calculates prices, triggering onPriceChange callback
  private handleLogEvent(log: EthereumLog) {
    const poolAddress = log.address.toLowerCase();
    const pool = this.pools.find(p => p.address.toLowerCase() === poolAddress);
    
    if (!pool) {
      return;
    }

    const liquidityPool = this.liquidityPools.get(poolAddress);
    if (!liquidityPool) {
      return;
    }

    try {
      const swapData = liquidityPool.parseSwapEventData(log);
      
      const { token0Price, token1Price } = calculatePriceFromSqrtPriceX96(
        BigInt(swapData.sqrtPriceX96),
        pool.token0Decimals,
        pool.token1Decimals
      );

      const newPrice: PoolPrice = {
        poolAddress: pool.address,
        token0Price,
        token1Price,
        timestamp: Date.now()
      };

      const oldPrice = this.currentPrices.get(poolAddress) || null;
      this.currentPrices.set(poolAddress, newPrice);
      this.onPriceChange(pool, newPrice, oldPrice);
    } catch (error) {
      return;
    }
  }

  private subscribeToPoolSwaps() {
    if (!this.rpc) return;

    for (const pool of this.pools) {
      const liquidityPool = this.liquidityPools.get(pool.address.toLowerCase());
      if (!liquidityPool) continue;

      const swapEventSignature = liquidityPool.getSwapEventSignature();
      
      this.rpc.subscribeToLogs({
        address: [pool.address],
        topics: [swapEventSignature]
      });

      log(`[${new Date().toISOString()}] Subscribed to swaps for ${pool.token0Symbol}/${pool.token1Symbol} (${pool.address})`);
    }
  }

  private attemptReconnect() {
    if (this.isRateLimited) {
      log(`[${new Date().toISOString()}] Cooling down for 60s due to rate limit...`);
      setTimeout(() => {
        this.isRateLimited = false;
        this.reconnectAttempts = 0;
        this.createRPCConnection();
      }, 60000);
      return;
    }

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logError(`Max reconnection attempts reached. Waiting 5 minutes before trying again...`);
      setTimeout(() => {
        log(`[${new Date().toISOString()}] Resuming connection attempts after long wait...`);
        this.reconnectAttempts = 0;
        this.createRPCConnection();
      }, 5 * 60 * 1000);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    log(`[${new Date().toISOString()}] Attempting to reconnect in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

    setTimeout(() => {
      this.createRPCConnection();
    }, delay);
  }

  private startHeartbeatMonitor() {
    setInterval(() => {
      const now = Date.now();
      const timeSinceLastMessage = now - this.lastMessageTime;

      if (timeSinceLastMessage > CONNECTION_TIMEOUT) {
        logWarn(`[${new Date().toISOString()}] No messages received for ${Math.floor(timeSinceLastMessage / 1000)}s. Connection may be stale.`);
        this.rpc?.close();
        this.attemptReconnect();
      }
    }, HEARTBEAT_INTERVAL);
  }

  // Main entry point: initializes config, discovers pools, and starts WebSocket monitoring
  public async start({ 
    clearCache = false,
    tokens,
    protocols,
    discovery
  }: { 
    clearCache?: boolean;
    tokens?: Record<string, string>;
    protocols?: Record<string, ProtocolConfig>;
    discovery?: DiscoveryConfig;
  } = {}) {
    if (protocols || discovery) {
      if (!protocols || !discovery) {
        throw new Error('Both protocols and discovery must be provided together when using programmatic configuration');
      }
      await initialize({ config: { protocols, discovery } });
    } else {
      await initialize({ configPath: this.configPath });
    }
    this.poolDiscovery = new PoolDiscovery();

    if (tokens) {
      setTokenWhitelist(tokens);
    } else {
      await loadTokenWhitelist();
    }

    if (clearCache) {
      log('Clearing cache...');
      await this.poolDiscovery?.forceRefresh();
      log('Cache cleared');
    }

    log('Discovering pools...');
    this.pools = await this.poolDiscovery?.discoverPools();
    log(`Found ${this.pools.length} pools`);

    const config = getConfig();
    for (const pool of this.pools) {
      const protocolConfig = config.protocols[pool.protocol];
      if (!protocolConfig) {
        logWarn(`Protocol config not found for: ${pool.protocol}, skipping pool ${pool.address}`);
        continue;
      }

      const poolType = protocolConfig.poolType || 'UniswapV3';
      
      try {
        const liquidityPool = instantiateLiquidityPool(poolType, pool.address);
        this.liquidityPools.set(pool.address.toLowerCase(), liquidityPool);
      } catch (error) {
        logError(`Failed to instantiate liquidity pool for ${pool.address}:`, error);
      }
    }

    log(`Initialized ${this.liquidityPools.size} liquidity pool instances`);

    this.createRPCConnection();
    this.startHeartbeatMonitor();
  }

  public stop() {
    this.rpc?.close();
  }
}

export { Scanner };
