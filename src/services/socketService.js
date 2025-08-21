import { io } from 'socket.io-client';

class GameWebSocket {
  constructor() {
    this.socket = null;
    this.eventHandlers = new Map();
    this.isConnecting = false;
    this.connectPromise = null;
  }

  connect() {
    if (this.socket?.connected) return Promise.resolve();
    if (this.isConnecting) return this.connectPromise;

    this.isConnecting = true;
    
    if (this.socket) {
        this.socket.close();
        this.socket.removeAllListeners();
    }

    this.connectPromise = new Promise((resolve, reject) => {
      console.log('🔌 Intentando conectar al servidor...');
      this.socket = io(import.meta.env.VITE_WS_URL, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        transports: ['websocket', 'polling'],
        forceNew: true,
      });

      this.socket.on('connect', () => {
        console.log('✅ Conectado exitosamente al servidor. ID:', this.socket.id);
        this.isConnecting = false;
        this.restoreEventHandlers();
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('❌ Desconectado del servidor:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔥 Error de conexión:', error.message);
        this.isConnecting = false;
        reject(error);
      });
    });

    return this.connectPromise;
  }
  
  async _request(eventName, responseEvent, data, timeoutMs = 15000) {
    await this.ensureConnection();
    return new Promise((resolve, reject) => {
      let timeout;
      const handleResponse = (response) => {
        clearTimeout(timeout);
        this.socket.off('error', handleError);
        resolve(response);
      };
      const handleError = (error) => {
        clearTimeout(timeout);
        this.socket.off(responseEvent, handleResponse);
        reject(error);
      };
      timeout = setTimeout(() => {
        this.socket.off(responseEvent, handleResponse);
        this.socket.off('error', handleError);
        reject(new Error(`Timeout: No se recibió respuesta para '${eventName}' a tiempo.`));
      }, timeoutMs);
      
      this.socket.once(responseEvent, handleResponse);
      this.socket.once('error', handleError);
      console.log(`[EMIT-REQ] ${eventName}`, data);
      this.socket.emit(eventName, data);
    });
  }

  // --- MÉTODOS DE PETICIÓN-RESPUESTA (usan _request) ---
  createRoom(roomConfig) { return this._request('createRoom', 'roomCreated', roomConfig); }
  joinRoom(roomCode, playerInfo) { return this._request('joinRoom', 'roomJoined', { roomCode, ...playerInfo }); }
  selectCategory(data) { return this._request('selectCategory', 'categorySelected', data); }
  startSong(data) { return this._request('startSong', 'songStarted', data); }
  markPlayerCorrect(data) { return this._request('markPlayerCorrect', 'playerMarked', data); }
  enableMarking(data) { return this._request('enableMarking', 'markingEnabled', data); }
  disableMarking(data) { return this._request('disableMarking', 'markingDisabled', data); }
  gameOver(data) { return this._request('gameOver', 'gameOverConfirmed', data); }
  restartGame(data) { return this._request('restartGame', 'gameRestarted', data); }

  // --- MÉTODOS DE NOTIFICACIÓN (Fire-and-Forget) ---
  async submitPrediction(data) {
    await this.ensureConnection();
    console.log(`[EMIT] submitPrediction`, data);
    this.socket.emit('submitPrediction', data);
  }
  
  async setPlayerReady(roomCode) {
    await this.ensureConnection();
    console.log(`[EMIT] playerReady`, { roomCode });
    this.socket.emit('playerReady', { roomCode });
  }
  
  async startGame(data) {
    await this.ensureConnection();
    console.log(`[EMIT] startGame`, data);
    this.socket.emit('startGame', data);
  }
  
  async revealSong(data) {
    await this.ensureConnection();
    console.log(`[EMIT] revealSong`, data);
    this.socket.emit('revealSong', data);
  }
  
  async updateRoom(data) {
    await this.ensureConnection();
    console.log(`[EMIT] updateRoom`, data);
    this.socket.emit('updateRoom', data);
  }

  async winner(data) {
    await this.ensureConnection();
    console.log(`[EMIT] winner`, data);
    this.socket.emit('winner', data);
  }

  // --- GESTIÓN DE EVENTOS Y CONEXIÓN ---
  async ensureConnection() {
    if (!this.socket?.connected) {
      if (!this.isConnecting) await this.connect();
      else await this.connectPromise;
    }
  }

  on(event, handler) {
    this.eventHandlers.set(event, handler);
    if (this.socket) this.socket.on(event, handler);
  }

  off(event) {
    this.eventHandlers.delete(event);
    if (this.socket) this.socket.off(event);
  }

  restoreEventHandlers() {
    if (!this.socket) return;
    this.eventHandlers.forEach((_, event) => this.socket.off(event));
    this.eventHandlers.forEach((handler, event) => this.socket.on(event, handler));
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectPromise = null;
      this.isConnecting = false;
    }
  }
}

export const gameSocket = new GameWebSocket();