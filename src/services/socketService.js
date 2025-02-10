import SockJS from 'sockjs-client';

class GameWebSocket {
    constructor() {
        this.socket = null;
        this.eventHandlers = new Map();
        this.isConnecting = false;
        this.connected = false;
        this.connectionAttempts = 0;
        this.maxAttempts = 5;
        this.reconnectTimeout = null;
    }

    async connect() {
        if (this.socket?.connected) return;
        if (this.isConnecting) return;

        this.isConnecting = true;

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/';
                return;
            }

            const wsUrl = `${import.meta.env.VITE_WS_URL}/socket?token=${token}`;
            this.socket = new SockJS(wsUrl, null, {
                transports: ['websocket'],
                timeout: 5000
            });

            this.socket.onopen = () => {
                console.log('WebSocket conectado');
                this.connected = true;
                this.isConnecting = false;
                this.connectionAttempts = 0;
                this.restoreEventHandlers();
            };

            this.socket.onclose = (event) => {
                console.log('WebSocket desconectado:', event.code);
                this.connected = false;
                this.isConnecting = false;

                if (event.code === 1003 || event.code === 4001) {
                    localStorage.removeItem('token');
                    window.location.href = '/';
                    this.eventHandlers.get('tokenInvalid')?.();
                } else if (this.connectionAttempts < this.maxAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
                    this.reconnectTimeout = setTimeout(() => this.reconnect(), delay);
                }
            };

            this.socket.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data.error) {
                        this.eventHandlers.get('error')?.(data.error);
                        return;
                    }
                    const handler = this.eventHandlers.get(data.event);
                    if (handler) handler(data.payload);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };
        } catch (error) {
            this.isConnecting = false;
            throw error;
        }
    }

    async reconnect() {
        if (this.isConnecting) return;
        this.connectionAttempts++;
        console.log(`Intento de reconexión ${this.connectionAttempts}/${this.maxAttempts}`);
        await this.connect();
    }

    async send(event, data) {
        await this.ensureConnection();
        this.socket.send(JSON.stringify({ event, data }));
    }

    async createRoom(roomConfig) {
        return this.sendWithResponse('createRoom', roomConfig, 'roomCreated');
    }

    async joinRoom(roomCode, playerInfo) {
        return this.sendWithResponse('joinRoom', { roomCode, ...playerInfo }, 'roomJoined');
    }

    async sendWithResponse(event, data, responseEvent) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.off(responseEvent);
                this.off('error');
                reject(new Error('Timeout'));
            }, 10000);

            const handler = (response) => {
                clearTimeout(timeout);
                this.off(responseEvent);
                this.off('error');
                resolve(response);
            };

            const errorHandler = (error) => {
                clearTimeout(timeout);
                this.off(responseEvent);
                this.off('error');
                reject(error);
            };

            this.on(responseEvent, handler);
            this.on('error', errorHandler);
            this.send(event, data).catch(errorHandler);
        });
    }

    on(event, handler) {
        this.eventHandlers.set(event, handler);
        if (this.socket && event !== 'tokenInvalid' && event !== 'error') {
            this.socket.on?.(event, handler);
        }
    }

    off(event) {
        if (this.socket && event !== 'tokenInvalid' && event !== 'error') {
            this.socket.off?.(event);
        }
        this.eventHandlers.delete(event);
    }

    restoreEventHandlers() {
        this.eventHandlers.forEach((handler, event) => {
            if (event !== 'tokenInvalid' && event !== 'error') {
                this.socket.on?.(event, handler);
            }
        });
    }

    async ensureConnection() {
        if (!this.connected) {
            await this.connect();
        }
    }

    disconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this.connected = false;
            this.isConnecting = false;
            this.connectionAttempts = 0;
        }
    }
}

export const gameSocket = new GameWebSocket();