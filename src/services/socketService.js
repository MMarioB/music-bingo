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

      } catch (error) {
        console.error('🔥 Error al crear socket:', error);
        this.isConnecting = false;
        this.socket = null;
        reject(error);
      }
    });

    return this.connectPromise;
  }
  
  // MÉTODO HÍBRIDO SEGURO: Para métodos que emiten eventos Y usan callbacks
  async _hybridEmit(eventName, responseEventName, data, timeoutMs = 15000) {
    await this.ensureConnection();
    
    if (!this.socket?.connected || typeof this.socket.emit !== 'function') {
      throw new Error(`Socket no válido para ${eventName}`);
    }

    return new Promise((resolve, reject) => {
      let resolved = false;
      
      const cleanup = () => {
        if (this.socket?.off && typeof this.socket.off === 'function') {
          this.socket.off(responseEventName, handleEvent);
          this.socket.off('error', handleError);
        }
      };
      
      const handleEvent = (response) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(response);
      };
      
      const handleError = (error) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        reject(error);
      };
      
      const timeout = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        cleanup();
        reject(new Error(`Timeout: ${eventName}`));
      }, timeoutMs);
      
      // Escuchar el evento de respuesta
      if (this.socket?.on && typeof this.socket.on === 'function') {
        this.socket.once(responseEventName, handleEvent);
        this.socket.once('error', handleError);
      }
      
      console.log(`[EMIT-HYBRID] ${eventName}`, data);
      
      try {
        // Emit con callback (tu servidor también usa callbacks)
        this.socket.emit(eventName, data, (callbackResponse) => {
          clearTimeout(timeout);
          // Si hay error en callback, rechazar inmediatamente
          if (callbackResponse?.error) {
            if (!resolved) {
              resolved = true;
              cleanup();
              reject(new Error(callbackResponse.error));
            }
          }
          // Si no hay error, seguir esperando el evento
        });
      } catch (error) {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(error);
        }
      }
    });
  }

  // MÉTODO CALLBACK SIMPLE: Para métodos que solo usan callbacks
  async _callbackEmit(eventName, data, timeoutMs = 15000) {
    await this.ensureConnection();
    
    if (!this.socket?.connected || typeof this.socket.emit !== 'function') {
      throw new Error(`Socket no válido para ${eventName}`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout: ${eventName}`));
      }, timeoutMs);
      
      console.log(`[EMIT-CALLBACK] ${eventName}`, data);
      
      try {
        this.socket.emit(eventName, data, (response) => {
          clearTimeout(timeout);
          if (response?.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  // MÉTODO FIRE-AND-FORGET: Para métodos que no esperan respuesta
  async _fireAndForget(eventName, data) {
    await this.ensureConnection();
    
    if (!this.socket?.connected || typeof this.socket.emit !== 'function') {
      throw new Error(`Socket no válido para ${eventName}`);
    }

    console.log(`[EMIT] ${eventName}`, data);
    
    try {
      this.socket.emit(eventName, data);
    } catch (error) {
      console.error(`Error emitiendo ${eventName}:`, error);
      throw error;
    }
  }

  // --- MÉTODOS SEGÚN TU SERVIDOR EXACTO ---
  
  // createRoom: Tu servidor emite 'roomCreated' Y usa callback
  createRoom(roomConfig) {
    return this._hybridEmit('createRoom', 'roomCreated', roomConfig);
  }
  
  // joinRoom: Tu servidor emite 'roomJoined' Y usa callback
  joinRoom(roomCode, playerInfo) {
    return this._hybridEmit('joinRoom', 'roomJoined', { roomCode, ...playerInfo });
  }
  
  // selectCategory: Tu servidor emite 'categorySelected' Y usa callback
  selectCategory(data) {
    return this._hybridEmit('selectCategory', 'categorySelected', data);
  }
  
  // startSong: Tu servidor emite 'songStarted' Y usa callback
  startSong(data) {
    return this._hybridEmit('startSong', 'songStarted', data);
  }
  
  // gameOver: Tu servidor emite 'gameOverConfirmed' Y usa callback
  gameOver(data) {
    return this._hybridEmit('gameOver', 'gameOverConfirmed', data);
  }
  
  // restartGame: Tu servidor emite 'gameRestarted' Y usa callback
  restartGame(data) {
    return this._hybridEmit('restartGame', 'gameRestarted', data);
  }
  
  // Estos solo usan callback según tu servidor
  markPlayerCorrect(data) {
    return this._callbackEmit('markPlayerCorrect', data);
  }
  
  enableMarking(data) {
    return this._callbackEmit('enableMarking', data);
  }
  
  disableMarking(data) {
    return this._callbackEmit('disableMarking', data);
  }

  // --- MÉTODOS FIRE-AND-FORGET ---
  async submitPrediction(data) {
    return this._fireAndForget('submitPrediction', data);
  }
  
  async setPlayerReady(roomCode) {
    return this._fireAndForget('playerReady', { roomCode });
  }
  
  async startGame(data) {
    return this._fireAndForget('startGame', data);
  }
  
  async revealSong(data) {
    return this._fireAndForget('revealSong', data);
  }
  
  async updateRoom(data) {
    return this._fireAndForget('updateRoom', data);
  }

  async winner(data) {
    return this._fireAndForget('declareWinner', data);
  }

  async declareWinner(data) {
    return this._fireAndForget('declareWinner', data);
  }

  // --- GESTIÓN DE EVENTOS Y CONEXIÓN ---
  async ensureConnection() {
    if (this.socket?.connected) return;
    
    if (this.isConnecting && this.connectPromise) {
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
    if (this.socket?.on) {
      this.socket.on(event, handler);
    }
  }

  off(event) {
    this.eventHandlers.delete(event);
    if (this.socket?.off) {
      this.socket.off(event);
    }
  }

  restoreEventHandlers() {
    if (!this.socket?.on) return;
    
    this.eventHandlers.forEach((_, event) => {
      if (this.socket?.off) this.socket.off(event);
    });
    
    this.eventHandlers.forEach((handler, event) => {
      if (this.socket?.on) this.socket.on(event, handler);
    });
  }
  
  disconnect() {
    this.isConnecting = false;
    this.connectPromise = null;
    
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (error) {
        console.warn('Error al desconectar:', error);
      }
      this.socket = null;
    }
  }

  getConnectionInfo() {
    return {
      socketExists: !!this.socket,
      socketConnected: this.socket?.connected || false,
      socketId: this.socket?.id || null,
      isConnecting: this.isConnecting,
      hasEmitMethod: this.socket && typeof this.socket.emit === 'function'
    };
  }
}

export const gameSocket = new GameWebSocket();