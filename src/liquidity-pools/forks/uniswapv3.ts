import { keccak256, stringToBytes } from 'viem';
import { BaseLiquidityPool, EthereumLog, SwapEventData, UniswapV3SwapEventData } from '../liquidity-pool.js';

export class UniswapV3 implements BaseLiquidityPool {
  private contractAddress: string;
  private name: string = 'Uniswap V3';
  private readonly swapEventSignatureString: string = 'Swap(address,address,int256,int256,uint160,uint128,int24)';

  private token0Decimals: number;
  private token1Decimals: number;

  constructor(contractAddress: string, token0Decimals: number, token1Decimals: number) {
    this.contractAddress = contractAddress;
    this.token0Decimals = token0Decimals;
    this.token1Decimals = token1Decimals;
  }

  // Decodes Uniswap V3 Swap event from Ethereum log, extracting price and swap data
  parseSwapEventData(log: EthereumLog): UniswapV3SwapEventData {
    if (log.address.toLowerCase() !== this.contractAddress.toLowerCase()) {
      throw new Error('Log is not from the expected contract address');
    }

    const expectedTopic = keccak256(stringToBytes(this.swapEventSignatureString));
    if (!log.topics || log.topics.length === 0 || log.topics[0] !== expectedTopic) {
      throw new Error('Log is not a Swap event');
    }

    if (log.topics.length < 3) {
      throw new Error('Insufficient topics for Swap event');
    }

    const sender = '0x' + log.topics[1].slice(-40);
    const recipient = '0x' + log.topics[2].slice(-40);

    const data = log.data.startsWith('0x') ? log.data.slice(2) : log.data;

    if (data.length < 320) {
      throw new Error('Invalid data length for Swap event');
    }

    const amount0Hex = data.slice(0, 64);
    const amount1Hex = data.slice(64, 128);
    const sqrtPriceX96Hex = data.slice(128, 192);
    const liquidityHex = data.slice(192, 256);
    const tickHex = data.slice(256, 320);

    const amount0 = this.hexToSignedBigInt(amount0Hex);
    const amount1 = this.hexToSignedBigInt(amount1Hex);
    const sqrtPriceX96 = BigInt('0x' + sqrtPriceX96Hex);
    const liquidity = BigInt('0x' + liquidityHex);
    const tick = this.hexToSignedBigInt(tickHex, 24);

    const Q96 = BigInt(2) ** BigInt(96);
    const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
    const price = sqrtPrice * sqrtPrice;

    // Apply decimal adjustment internally
    const decimalAdjustment = 10 ** (this.token0Decimals - this.token1Decimals);
    const adjustedPrice = price * decimalAdjustment;

    return {
      amount0,
      amount1,
      sqrtPriceX96,
      liquidity,
      tick,
      sender,
      recipient,
      price: adjustedPrice,
    } as UniswapV3SwapEventData;
  }

  private hexToSignedBigInt(hex: string, bits: number = 256): bigint {
    const value = BigInt('0x' + hex);
    const maxValue = BigInt(2) ** BigInt(bits - 1);

    if (value >= maxValue) {
      return value - (BigInt(2) ** BigInt(bits));
    }
    return value;
  }

  getContractAddress(): string {
    return this.contractAddress;
  }

  getEventSignatures(): string[] {
    return [keccak256(stringToBytes(this.swapEventSignatureString))];
  }

  private sqrtPriceX96: bigint = 0n;

  getInitialStateCall(): { address: `0x${string}`; abi: any; functionName: string; args?: any[] } {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: [{
        constant: true,
        inputs: [],
        name: 'slot0',
        outputs: [
          { name: 'sqrtPriceX96', type: 'uint160' },
          { name: 'tick', type: 'int24' },
          { name: 'observationIndex', type: 'uint16' },
          { name: 'observationCardinality', type: 'uint16' },
          { name: 'observationCardinalityNext', type: 'uint16' },
          { name: 'feeProtocol', type: 'uint8' },
          { name: 'unlocked', type: 'bool' }
        ],
        type: 'function'
      }],
      functionName: 'slot0'
    };
  }

  applyInitialState(result: any): void {
    if (result && Array.isArray(result) && result.length >= 1) {
      this.sqrtPriceX96 = BigInt(result[0]);
    } else if (result && typeof result === 'object' && 'sqrtPriceX96' in result) {
      this.sqrtPriceX96 = BigInt(result.sqrtPriceX96);
    }
  }

  getCurrentPrice(): number {
    const Q96 = BigInt(2) ** BigInt(96);
    const sqrtPrice = Number(this.sqrtPriceX96) / Number(Q96);
    const price = sqrtPrice * sqrtPrice;
    const decimalAdjustment = 10 ** (this.token0Decimals - this.token1Decimals);
    return price * decimalAdjustment;
  }

  getName(): string {
    return this.name;
  }

  // Helper for Scanner to get current sqrtPriceX96
  getSqrtPriceX96(): bigint {
    return this.sqrtPriceX96;
  }
}