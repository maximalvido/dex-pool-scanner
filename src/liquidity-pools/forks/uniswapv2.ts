import { keccak256, stringToBytes } from 'viem';
import { BaseLiquidityPool, EthereumLog, UniswapV2SwapEventData } from '../liquidity-pool.js';

export class UniswapV2 implements BaseLiquidityPool {
  private contractAddress: string;
  private name: string = 'Uniswap V2';
  private readonly swapEventSignatureString: string = 'Swap(address,uint256,uint256,uint256,uint256,address)';
  private readonly syncEventSignatureString: string = 'Sync(uint112,uint112)';

  private reserve0: bigint = 0n;
  private reserve1: bigint = 0n;

  private token0Decimals: number;
  private token1Decimals: number;

  constructor(contractAddress: string, token0Decimals: number, token1Decimals: number) {
    this.contractAddress = contractAddress;
    this.token0Decimals = token0Decimals;
    this.token1Decimals = token1Decimals;
  }

  // Decodes Uniswap V2 Swap or Sync event from Ethereum log
  parseSwapEventData(log: EthereumLog): UniswapV2SwapEventData {
    if (log.address.toLowerCase() !== this.contractAddress.toLowerCase()) {
      throw new Error('Log is not from the expected contract address');
    }

    const swapTopic = keccak256(stringToBytes(this.swapEventSignatureString));
    const syncTopic = keccak256(stringToBytes(this.syncEventSignatureString));

    if (log.topics[0] === swapTopic) {
      return this.parseSwapEvent(log);
    } else if (log.topics[0] === syncTopic) {
      return this.parseSyncEvent(log);
    }

    throw new Error('Log is not a recognized Uniswap V2 event');
  }

  private parseSwapEvent(log: EthereumLog): UniswapV2SwapEventData {
    // Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)
    const data = log.data.startsWith('0x') ? log.data.slice(2) : log.data;

    if (data.length < 256) {
      throw new Error('Invalid data length for Uniswap V2 Swap event');
    }

    const amount0In = BigInt('0x' + data.slice(0, 64));
    const amount1In = BigInt('0x' + data.slice(64, 128));
    const amount0Out = BigInt('0x' + data.slice(128, 192));
    const amount1Out = BigInt('0x' + data.slice(192, 256));

    const sender = '0x' + log.topics[1].slice(-40);
    const recipient = '0x' + log.topics[2].slice(-40);

    // In V2, amounts are positive. Net amount = input - output (Input is positive, Output is negative)
    const amount0 = amount0In - amount0Out;
    const amount1 = amount1In - amount1Out;

    // Price = reserve1 / reserve0 (using the reserves from the last Sync event)
    const price = this.reserve0 > 0n ? Number(this.reserve1) / Number(this.reserve0) : 0;
    const decimalAdjustment = 10 ** (this.token0Decimals - this.token1Decimals);
    const adjustedPrice = price * decimalAdjustment;

    return {
      amount0,
      amount1,
      sender,
      recipient,
      price: adjustedPrice,
      reserve0: this.reserve0,
      reserve1: this.reserve1,
    } as UniswapV2SwapEventData;
  }

  private parseSyncEvent(log: EthereumLog): UniswapV2SwapEventData {
    // Implement V2 Sync parsing logic here
    // Sync(uint112 reserve0, uint112 reserve1)
    const data = log.data.startsWith('0x') ? log.data.slice(2) : log.data;
    const reserve0 = BigInt('0x' + data.slice(0, 64));
    const reserve1 = BigInt('0x' + data.slice(64, 128));

    // Price = reserve1 / reserve0 (assuming token0 is base)
    const price = reserve0 > 0n ? Number(reserve1) / Number(reserve0) : 0;
    const decimalAdjustment = 10 ** (this.token0Decimals - this.token1Decimals);
    const adjustedPrice = price * decimalAdjustment;

    // Update internal reserves state
    this.reserve0 = reserve0;
    this.reserve1 = reserve1;

    return {
      amount0: BigInt(0),
      amount1: BigInt(0),
      sender: this.contractAddress,
      recipient: this.contractAddress,
      reserve0,
      reserve1,
      price: adjustedPrice,
    } as UniswapV2SwapEventData;
  }

  getContractAddress(): string {
    return this.contractAddress;
  }

  getEventSignatures(): string[] {
    return [
      keccak256(stringToBytes(this.swapEventSignatureString)),
      keccak256(stringToBytes(this.syncEventSignatureString))
    ];
  }

  getInitialStateCall(): { address: `0x${string}`; abi: any; functionName: string; args?: any[] } {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: [{
        constant: true,
        inputs: [],
        name: 'getReserves',
        outputs: [
          { name: 'reserve0', type: 'uint112' },
          { name: 'reserve1', type: 'uint112' },
          { name: 'blockTimestampLast', type: 'uint32' }
        ],
        type: 'function'
      }],
      functionName: 'getReserves'
    };
  }

  applyInitialState(result: any): void {
    if (result && Array.isArray(result) && result.length >= 2) {
      this.reserve0 = BigInt(result[0]);
      this.reserve1 = BigInt(result[1]);
    } else if (result && typeof result === 'object' && 'reserve0' in result) {
      this.reserve0 = BigInt(result.reserve0);
      this.reserve1 = BigInt(result.reserve1);
    }
  }

  getCurrentPrice(): number {
    const price = this.reserve0 > 0n ? Number(this.reserve1) / Number(this.reserve0) : 0;
    const decimalAdjustment = 10 ** (this.token0Decimals - this.token1Decimals);
    return price * decimalAdjustment;
  }

  getName(): string {
    return this.name;
  }
}
