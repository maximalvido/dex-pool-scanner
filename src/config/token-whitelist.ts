import * as fs from 'fs/promises';
import * as path from 'path';
import { log, logError, logWarn } from '../utils/logger';

export interface TokenWhitelistConfig {
  tokens: Record<string, string>;
}

let tokenWhitelist: string[] = [];
let tokenSymbolMap: Map<string, string> = new Map();
let isWhitelistLoaded = false;

export function setTokenWhitelist(tokens: Record<string, string>): void {
  tokenWhitelist = [];
  tokenSymbolMap = new Map();
  
  for (const [symbol, address] of Object.entries(tokens)) {
    const normalizedAddr = address.toLowerCase();
    tokenWhitelist.push(normalizedAddr);
    tokenSymbolMap.set(normalizedAddr, symbol);
  }
  
  isWhitelistLoaded = true;
  log(`Set ${tokenWhitelist.length} tokens in whitelist`);
}

export async function loadTokenWhitelist(tokensPath?: string): Promise<void> {
  if (isWhitelistLoaded) {
    return;
  }

  const defaultPath = path.resolve(process.cwd(), 'tokens.json');
  const resolvedPath = tokensPath 
    ? (path.isAbsolute(tokensPath) ? tokensPath : path.resolve(process.cwd(), tokensPath))
    : defaultPath;

  try {
    const fileContent = await fs.readFile(resolvedPath, 'utf-8');
    const config: TokenWhitelistConfig = JSON.parse(fileContent);

    if (!config.tokens || typeof config.tokens !== 'object') {
      logWarn('Invalid tokens.json format. Showing all pools.');
      tokenWhitelist = [];
      tokenSymbolMap = new Map();
      isWhitelistLoaded = true;
      return;
    }

    setTokenWhitelist(config.tokens);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      log('tokens.json not found. Showing all pools (no filtering).');
      tokenWhitelist = [];
      tokenSymbolMap = new Map();
      isWhitelistLoaded = true;
    } else {
      logError('Error loading tokens.json:', error);
      log('Showing all pools (no filtering).');
      tokenWhitelist = [];
      tokenSymbolMap = new Map();
      isWhitelistLoaded = true;
    }
  }
}

export function getTokenSymbol(address: string): string | undefined {
  return tokenSymbolMap.get(address.toLowerCase());
}

export function isWhitelistedToken(address: string): boolean {
  if (tokenWhitelist.length === 0) {
    return true;
  }
  return tokenWhitelist.includes(address.toLowerCase());
}

export function areBothTokensWhitelisted(token0: string, token1: string): boolean {
  if (tokenWhitelist.length === 0) {
    return true;
  }
  return isWhitelistedToken(token0) && isWhitelistedToken(token1);
}

export function getTokenWhitelist(): string[] {
  return [...tokenWhitelist];
}

export function isTokenWhitelistLoaded(): boolean {
  return isWhitelistLoaded;
}

export function resetTokenWhitelist(): void {
  tokenWhitelist = [];
  tokenSymbolMap = new Map();
  isWhitelistLoaded = false;
}
