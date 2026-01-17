import { keccak256, stringToBytes } from 'viem';
import { BaseLiquidityPool, EthereumLog, SwapEventData } from '../liquidity-pool.js';

export class UniswapV3 implements BaseLiquidityPool {
  private contractAddress: string;
  private name: string = 'Uniswap V3';
  private readonly swapEventSignatureString: string = 'Swap(address,address,int256,int256,uint160,uint128,int24)';

  constructor(contractAddress: string) {
    this.contractAddress = contractAddress;
  }

  // Decodes Uniswap V3 Swap event from Ethereum log, extracting price and swap data
  parseSwapEventData(log: EthereumLog): SwapEventData {
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

    return {
        amount0,
        amount1,
        sqrtPriceX96,
        liquidity,
        tick,
        sender,
        recipient,
        price,
    } as SwapEventData;
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

  getSwapEventSignature(): string {
    return keccak256(stringToBytes(this.swapEventSignatureString));
  }

  getName(): string {
    return this.name;
  }
}