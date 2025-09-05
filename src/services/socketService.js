import { io } from 'socket.io-client';

class GameWebSocket {
  constructor() {
    this.socket = null;
    this.eventHandlers = new Map();
    this.isConnecting = false;
    this.connectPromise = null;
    this.connectionState = 'disconnected';
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
  
  // HÍBRIDO: Para métodos que usan callback Y emiten eventos (como createRoom, joinRoom)
  async _hybridRequest(eventName, responseEvent, data, timeoutMs = 15000) {
    await this.ensureConnection();
    
    if (!this.socket || typeof this.socket.emit !== 'function') {
      throw new Error('Socket no disponible o no válido');
    }
    
    return new Promise((resolve, reject) => {
      let timeout;
      let callbackHandled = false;
      
      // Escuchar el evento de respuesta
      const handleResponse = (response) => {
        if (callbackHandled) return;
        callbackHandled = true;
        clearTimeout(timeout);
        resolve(response);
      };
      
      const handleError = (error) => {
        if (callbackHandled) return;
        callbackHandled = true;
        clearTimeout(timeout);
        reject(error);
      };
      
      timeout = setTimeout(() => {
        if (callbackHandled) return;
        callbackHandled = true;
        this.socket.off(responseEvent, handleResponse);
        this.socket.off('error', handleError);
        reject(new Error(`Timeout: No se recibió respuesta para '${eventName}' a tiempo.`));
      }, timeoutMs);
      
      this.socket.once(responseEvent, handleResponse);
      this.socket.once('error', handleError);
      
      console.log(`[EMIT-HYBRID] ${eventName}`, data);
      
      // Emit con callback Y escuchar evento
      this.socket.emit(eventName, data, (callbackResponse) => {
        // Si el callback tiene error, rechazar
        if (callbackResponse && callbackResponse.error) {
          handleError(new Error(callbackResponse.error));
        }
        // Si no, seguir esperando el evento de respuesta
      });
    });
  }

  // CALLBACK SOLO: Para métodos que solo usan callback
  async _callbackRequest(eventName, data, timeoutMs = 15000) {
    await this.ensureConnection();
    
    if (!this.socket || typeof this.socket.emit !== 'function') {
      throw new Error('Socket no disponible o no válido');
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout: No se recibió respuesta para '${eventName}' a tiempo.`));
      }, timeoutMs);
      
      console.log(`[EMIT-CALLBACK] ${eventName}`, data);
      
      this.socket.emit(eventName, data, (response) => {
        clearTimeout(timeout);
        if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  // --- MÉTODOS SEGÚN TU SERVIDOR ---
  
  // createRoom: Emite 'roomCreated' Y usa callback
  createRoom(roomConfig) { 
    return this._hybridRequest('createRoom', 'roomCreated', roomConfig); 
  }
  
  // joinRoom: Emite 'roomJoined' Y usa callback
  joinRoom(roomCode, playerInfo) { 
    return this._hybridRequest('joinRoom', 'roomJoined', { roomCode, ...playerInfo }); 
  }
  
  // selectCategory: Emite 'categorySelected' Y usa callback
  selectCategory(data) { 
    return this._hybridRequest('selectCategory', 'categorySelected', data); 
  }
  
  // startSong: Emite 'songStarted' Y usa callback
  startSong(data) { 
    return this._hybridRequest('startSong', 'songStarted', data); 
  }
  
  // markPlayerCorrect: Solo callback (según tu servidor)
  markPlayerCorrect(data) { 
    return this._callbackRequest('markPlayerCorrect', data); 
  }
  
  // enableMarking: Solo callback
  enableMarking(data) { 
    return this._callbackRequest('enableMarking', data); 
  }
  
  // disableMarking: Solo callback
  disableMarking(data) { 
    return this._callbackRequest('disableMarking', data); 
  }
  
  // gameOver: Emite 'gameOverConfirmed' Y usa callback
  gameOver(data) { 
    return this._hybridRequest('gameOver', 'gameOverConfirmed', data); 
  }
  
  // restartGame: Emite 'gameRestarted' Y usa callback
  restartGame(data) { 
    return this._hybridRequest('restartGame', 'gameRestarted', data); 
  }

  // --- MÉTODOS FIRE-AND-FORGET ---
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
      throw new Error('Socket no disponible para playerReady');
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

  // Tu servidor escucha 'declareWinner'
  async declareWinner(data) {
    await this.ensureConnection();
    if (!this.socket || typeof this.socket.emit !== 'function') {
      throw new Error('Socket no disponible para declareWinner');
    }
    console.log(`[EMIT] declareWinner`, data);
    this.socket.emit('declareWinner', data);
  }

  // Alias para compatibilidad
  async winner(data) {
    return this.declareWinner(data);
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
    
    await this.connect();
    
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
    
    this.eventHandlers.forEach((_, event) => {
      if (typeof this.socket.off === 'function') {
        this.socket.off(event);
      }
    });
    
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