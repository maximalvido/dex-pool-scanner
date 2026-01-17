import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import { EVMTransaction } from '../types';
import { log, logError } from '../utils/logger';

export class RPC {
    private ws: WebSocket;
    private url: string;

    constructor(url: string, {
        onMessage = () => { },
        onError = () => { },
        onClose = () => { },
        onOpen = () => { }
    }: { onMessage?: (message: any) => void, onError?: (error: any) => void, onClose?: () => void, onOpen?: () => void }) {
        this.url = url;
        this.ws = new WebSocket(url);
        this.ws.on('open', () => {
            log('----------------------------------------------------------------------------');
            log('Connected to the blockchain');
            log('----------------------------------------------------------------------------');
            onOpen?.();
        });
        this.ws.on('message', (message: any) => {
            let decodedMessage: any;

            if (Buffer.isBuffer(message)) {
                const messageString = message.toString('utf8');
                try {
                    decodedMessage = JSON.parse(messageString);
                } catch {
                    decodedMessage = messageString;
                }
            } else if (typeof message === 'string') {
                try {
                    decodedMessage = JSON.parse(message);
                } catch {
                    decodedMessage = message;
                }
            } else {
                decodedMessage = message;
            }

            if (decodedMessage && decodedMessage.error) {
                logError('JSON-RPC Error:', {
                    code: decodedMessage.error.code,
                    message: decodedMessage.error.message,
                    id: decodedMessage.id
                });
                onError?.(decodedMessage.error);
            } else {
                onMessage?.(decodedMessage);
            }

        });
        this.ws.on('error', (error: any) => {
            console.error('Error from the blockchain:', error);
            onError?.(error);
        });
        this.ws.on('close', () => {
            console.log('Disconnected from the blockchain');
            onClose?.();
        });
    }

    private generateMessageId(): string {
        return randomUUID();
    }

    public subscribeToBlocks() {
        const id = this.generateMessageId();
        this.ws.send(JSON.stringify({
            id,
            jsonrpc: '2.0',
            method: 'eth_subscribe',
            params: ['newHeads']
        }));
    }

    public subscribeToTransactions() {
        const id = this.generateMessageId();
        this.ws.send(JSON.stringify({
            id,
            jsonrpc: '2.0',
            method: 'eth_subscribe',
            params: ['newPendingTransactions']
        }));
    }

    public subscribeToLogs(filter: { address?: string[], topics?: (string | string[] | null)[] }) {
        const id = this.generateMessageId();

        this.ws.send(JSON.stringify({
            id,
            jsonrpc: '2.0',
            method: 'eth_subscribe',
            params: ['logs', filter]
        }));
    }

    public sendTransaction(transaction: EVMTransaction) {
        const id = this.generateMessageId();
        this.ws.send(JSON.stringify({
            id,
            jsonrpc: '2.0',
            method: 'eth_sendTransaction',
            params: [transaction]
        }));
    }

    public callTransaction(transaction: EVMTransaction) {
        const id = this.generateMessageId();
        this.ws.send(JSON.stringify({
            id,
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [transaction]
        }));
    }

    public estimateGas(transaction: EVMTransaction) {
        const id = this.generateMessageId();
        this.ws.send(JSON.stringify({
            id,
            jsonrpc: '2.0',
            method: 'eth_estimateGas',
            params: [transaction]
        }));
    }

    signTransaction(transaction: EVMTransaction) {
        const id = this.generateMessageId();
        this.ws.send(JSON.stringify({
            id,
            jsonrpc: '2.0',
            method: 'eth_signTransaction',
            params: [transaction]
        }));
    }

    public close() {
        this.ws.terminate();
        log('Disconnected from the blockchain');
    }

}