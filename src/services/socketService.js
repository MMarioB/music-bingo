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
            console.log('Connecting to:', wsUrl);
            
            this.socket = new SockJS(wsUrl);

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
                } else if (this.connectionAttempts < this.maxAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
                    this.reconnectTimeout = setTimeout(() => this.reconnect(), delay);
                }
            };

            this.socket.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    console.log('Mensaje recibido:', data);
                    
                    if (data.error) {
                        const handler = this.eventHandlers.get('error');
                        if (handler) handler(data.error);
                        return;
                    }

                    const handler = this.eventHandlers.get(data.event);
                    if (handler) handler(data);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };
        } catch (error) {
            this.isConnecting = false;
            throw error;
        }
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

    async setPlayerReady(roomCode) {
        return this.sendWithResponse('playerReady', { roomCode }, 'playersUpdate');
    }

    async startGame(roomCode, difficulty) {
        return this.sendWithResponse('startGame', { roomCode, difficulty }, 'gameStarted');
    }

    async selectCategory(data) {
        return this.sendWithResponse('selectCategory', data, 'categorySelected');
    }

    async revealSong(data) {
        await this.send('revealSong', data);
    }

    async enableMarking(data) {
        await this.send('enableMarking', data);
    }

    async disableMarking(data) {
        await this.send('disableMarking', data);
    }

    async winner(data) {
        await this.send('winner', data);
    }

    async sendWithResponse(event, data, responseEvent) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.eventHandlers.delete(responseEvent);
                reject(new Error('Timeout'));
            }, 10000);

            const handler = (response) => {
                clearTimeout(timeout);
                this.eventHandlers.delete(responseEvent);
                resolve(response);
            };

            this.eventHandlers.set(responseEvent, handler);
            this.send(event, data).catch(reject);
        });
    }

    async reconnect() {
        if (this.isConnecting) return;
        this.connectionAttempts++;
        console.log(`Intento de reconexión ${this.connectionAttempts}/${this.maxAttempts}`);
        await this.connect();
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

    on(event, handler) {
        this.eventHandlers.set(event, handler);
    }

    off(event) {
        this.eventHandlers.delete(event);
    }
}

export const gameSocket = new GameWebSocket();