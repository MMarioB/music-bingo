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
    
    // Limpiar socket anterior completamente
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
  
  // Método más simple y seguro
  async _safeEmit(eventName, data, useCallback = false, timeoutMs = 15000) {
    await this.ensureConnection();
    
    // Verificación extra de seguridad
    if (!this.socket) {
      throw new Error('Socket no inicializado');
    }
    
    if (typeof this.socket.emit !== 'function') {
      throw new Error('Socket.emit no es una función');
    }
    
    if (!this.socket.connected) {
      throw new Error('Socket no está conectado');
    }

    console.log(`[EMIT${useCallback ? '-CALLBACK' : ''}] ${eventName}`, data);
    
    if (useCallback) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout en ${eventName}`));
        }, timeoutMs);
        
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
    } else {
      // Fire and forget - más seguro
      try {
        this.socket.emit(eventName, data);
      } catch (error) {
        console.error(`Error emitiendo ${eventName}:`, error);
        throw error;
      }
    }
  }

  // --- MÉTODOS SIMPLIFICADOS SEGÚN TU SERVIDOR ---
  
  async createRoom(roomConfig) {
    return this._safeEmit('createRoom', roomConfig, true);
  }
  
  async joinRoom(roomCode, playerInfo) {
    return this._safeEmit('joinRoom', { roomCode, ...playerInfo }, true);
  }
  
  async selectCategory(data) {
    return this._safeEmit('selectCategory', data, true);
  }
  
  async startSong(data) {
    return this._safeEmit('startSong', data, true);
  }
  
  async markPlayerCorrect(data) {
    return this._safeEmit('markPlayerCorrect', data, true);
  }
  
  async enableMarking(data) {
    return this._safeEmit('enableMarking', data, true);
  }
  
  async disableMarking(data) {
    return this._safeEmit('disableMarking', data, true);
  }
  
  async gameOver(data) {
    return this._safeEmit('gameOver', data, true);
  }
  
  async restartGame(data) {
    return this._safeEmit('restartGame', data, true);
  }

  // --- MÉTODOS FIRE-AND-FORGET ---
  async submitPrediction(data) {
    return this._safeEmit('submitPrediction', data, false);
  }
  
  async setPlayerReady(roomCode) {
    return this._safeEmit('playerReady', { roomCode }, false);
  }
  
  async startGame(data) {
    return this._safeEmit('startGame', data, false);
  }
  
  async revealSong(data) {
    return this._safeEmit('revealSong', data, false);
  }
  
  async updateRoom(data) {
    return this._safeEmit('updateRoom', data, false);
  }

  async winner(data) {
    return this._safeEmit('declareWinner', data, false);
  }

  async declareWinner(data) {
    return this._safeEmit('declareWinner', data, false);
  }

  // --- GESTIÓN DE EVENTOS Y CONEXIÓN ---
  async ensureConnection() {
    if (this.socket?.connected) {
      return;
    }
    
    if (this.isConnecting && this.connectPromise) {
      await this.connectPromise;
      return;
    }
    
    await this.connect();
    
    // Verificación final
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
    
    // Limpiar y restaurar handlers
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

  // Método para debugging más detallado
  getConnectionInfo() {
    return {
      socketExists: !!this.socket,
      socketConnected: this.socket?.connected || false,
      socketId: this.socket?.id || null,
      isConnecting: this.isConnecting,
      hasEmitMethod: this.socket && typeof this.socket.emit === 'function',
      socketType: this.socket ? this.socket.constructor.name : null,
      socketMethods: this.socket ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.socket)).filter(name => typeof this.socket[name] === 'function') : []
    };
  }

  // Método para debugging el socket
  inspectSocket() {
    console.log('🔍 Socket inspection:', {
      socket: this.socket,
      type: typeof this.socket,
      constructor: this.socket?.constructor?.name,
      connected: this.socket?.connected,
      id: this.socket?.id,
      emit: typeof this.socket?.emit,
      methods: this.socket ? Object.getOwnPropertyNames(this.socket) : []
    });
  }
}

export const gameSocket = new GameWebSocket();