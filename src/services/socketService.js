import { io } from 'socket.io-client';

class GameWebSocket {
  constructor() {
    this.socket = null;
    this.eventHandlers = new Map();
    this.isConnecting = false;
    this.connectPromise = null;
    this.connectionState = 'disconnected'; // 'disconnected', 'connecting', 'connected'
  }

  connect() {
    if (this.connectionState === 'connected' && this.socket?.connected) {
      return Promise.resolve();
    }
    
    if (this.isConnecting && this.connectPromise) {
      return this.connectPromise;
    }

    this.isConnecting = true;
    this.connectionState = 'connecting';
    
    // Limpiar conexión anterior si existe
    if (this.socket) {
      this.socket.close();
      this.socket.removeAllListeners();
      this.socket = null;
    }

    this.connectPromise = new Promise((resolve, reject) => {
      console.log('🔌 Intentando conectar al servidor...');
      
      try {
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
          this.connectionState = 'connected';
          this.restoreEventHandlers();
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.warn('❌ Desconectado del servidor:', reason);
          this.connectionState = 'disconnected';
          this.isConnecting = false;
        });

        this.socket.on('connect_error', (error) => {
          console.error('🔥 Error de conexión:', error.message);
          this.isConnecting = false;
          this.connectionState = 'disconnected';
          reject(error);
        });

      } catch (error) {
        console.error('🔥 Error al crear socket:', error);
        this.isConnecting = false;
        this.connectionState = 'disconnected';
        reject(error);
      }
    });

    return this.connectPromise;
  }
  
  async _request(eventName, responseEvent, data, timeoutMs = 15000) {
    await this.ensureConnection();
    
    // Verificación adicional antes de usar el socket
    if (!this.socket || typeof this.socket.emit !== 'function') {
      throw new Error('Socket no disponible o no válido');
    }
    
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
    if (!this.socket || typeof this.socket.emit !== 'function') {
      throw new Error('Socket no disponible para submitPrediction');
    }
    console.log(`[EMIT] submitPrediction`, data);
    this.socket.emit('submitPrediction', data);
  }
  
  async setPlayerReady(roomCode) {
    await this.ensureConnection();
    if (!this.socket || typeof this.socket.emit !== 'function') {
      throw new Error('Socket no disponible para setPlayerReady');
    }
    console.log(`[EMIT] playerReady`, { roomCode });
    this.socket.emit('playerReady', { roomCode });
  }
  
  async startGame(data) {
    await this.ensureConnection();
    if (!this.socket || typeof this.socket.emit !== 'function') {
      throw new Error('Socket no disponible para startGame');
    }
    console.log(`[EMIT] startGame`, data);
    this.socket.emit('startGame', data);
  }
  
  async revealSong(data) {
    await this.ensureConnection();
    if (!this.socket || typeof this.socket.emit !== 'function') {
      throw new Error('Socket no disponible para revealSong');
    }
    console.log(`[EMIT] revealSong`, data);
    this.socket.emit('revealSong', data);
  }
  
  async updateRoom(data) {
    await this.ensureConnection();
    if (!this.socket || typeof this.socket.emit !== 'function') {
      throw new Error('Socket no disponible para updateRoom');
    }
    console.log(`[EMIT] updateRoom`, data);
    this.socket.emit('updateRoom', data);
  }

  async winner(data) {
    await this.ensureConnection();
    if (!this.socket || typeof this.socket.emit !== 'function') {
      throw new Error('Socket no disponible para winner');
    }
    console.log(`[EMIT] winner`, data);
    this.socket.emit('winner', data);
  }

  // --- GESTIÓN DE EVENTOS Y CONEXIÓN ---
  async ensureConnection() {
    if (this.connectionState === 'connected' && this.socket?.connected) {
      return;
    }
    
    if (this.connectionState === 'connecting' && this.connectPromise) {
      await this.connectPromise;
      return;
    }
    
    // Si no está conectado, intentar conectar
    await this.connect();
    
    // Verificar que realmente se conectó
    if (!this.socket?.connected) {
      throw new Error('No se pudo establecer la conexión');
    }
  }

  on(event, handler) {
    this.eventHandlers.set(event, handler);
    if (this.socket && typeof this.socket.on === 'function') {
      this.socket.on(event, handler);
    }
  }

  off(event) {
    this.eventHandlers.delete(event);
    if (this.socket && typeof this.socket.off === 'function') {
      this.socket.off(event);
    }
  }

  restoreEventHandlers() {
    if (!this.socket || typeof this.socket.on !== 'function') return;
    
    // Limpiar handlers existentes
    this.eventHandlers.forEach((_, event) => {
      if (typeof this.socket.off === 'function') {
        this.socket.off(event);
      }
    });
    
    // Restaurar handlers
    this.eventHandlers.forEach((handler, event) => {
      if (typeof this.socket.on === 'function') {
        this.socket.on(event, handler);
      }
    });
  }
  
  disconnect() {
    this.connectionState = 'disconnected';
    this.isConnecting = false;
    this.connectPromise = null;
    
    if (this.socket) {
      if (typeof this.socket.disconnect === 'function') {
        this.socket.disconnect();
      }
      this.socket = null;
    }
  }

  // Método para debugging
  getConnectionInfo() {
    return {
      connectionState: this.connectionState,
      isConnecting: this.isConnecting,
      socketExists: !!this.socket,
      socketConnected: this.socket?.connected || false,
      socketId: this.socket?.id || null,
      hasEmitMethod: !!(this.socket && typeof this.socket.emit === 'function')
    };
  }
}

export const gameSocket = new GameWebSocket();