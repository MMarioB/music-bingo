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
        this.socket = null;
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
  
  // MÉTODO ÚNICO: callback para request-response, directo para fire-and-forget
  async _emit(eventName, data, expectResponse = false, timeoutMs = 15000) {
    await this.ensureConnection();
    
    console.log(`[EMIT${expectResponse ? '-CALLBACK' : ''}] ${eventName}`, data);
    
    if (expectResponse) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout: ${eventName}`));
        }, timeoutMs);
        
        this.socket.emit(eventName, data, (response) => {
          clearTimeout(timeout);
          if (response?.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });
    } else {
      this.socket.emit(eventName, data);
    }
  }

  // --- MÉTODOS QUE ESPERAN RESPUESTA (callback) ---
  createRoom(roomConfig) { 
    return this._emit('createRoom', roomConfig, true); 
  }
  
  joinRoom(roomCode, playerInfo) { 
    return this._emit('joinRoom', { roomCode, ...playerInfo }, true); 
  }
  
  selectCategory(data) { 
    return this._emit('selectCategory', data, true); 
  }
  
  startSong(data) { 
    return this._emit('startSong', data, true); 
  }
  
  // NUEVO MÉTODO AGREGADO
  declareWinner(data) { 
    return this._emit('declareWinner', data, true); 
  }

  // --- MÉTODOS FIRE-AND-FORGET (no esperan respuesta) ---
  async markPlayerCorrect(data) {
    await this._emit('markPlayerCorrect', data, false);
  }
  
  async enableMarking(data) {
    await this._emit('enableMarking', data, false);
  }
  
  async disableMarking(data) {
    await this._emit('disableMarking', data, false);
  }
  
  // TEMPORAL: Cambiar a callback para debug
  enableMarkingDebug(data) {
    console.log('🔧 DEBUG: Probando enableMarking con callback:', data);
    return this._emit('enableMarking', data, true);
  }
  
  disableMarkingDebug(data) {
    console.log('🔧 DEBUG: Probando disableMarking con callback:', data);
    return this._emit('disableMarking', data, true);
  }

  async submitPrediction(data) {
    await this._emit('submitPrediction', data, false);
  }
  
  async setPlayerReady(roomCode) {
    await this._emit('playerReady', { roomCode }, false);
  }
  
  async startGame(data) {
    await this._emit('startGame', data, false);
  }
  
  async revealSong(data) {
    await this._emit('revealSong', data, false);
  }
  
  async updateRoom(data) {
    await this._emit('updateRoom', data, false);
  }

  async winner(data) {
    await this._emit('winner', data, false);
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