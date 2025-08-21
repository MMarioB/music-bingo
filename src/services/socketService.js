import { io } from 'socket.io-client';

class GameWebSocket {
  constructor() {
    this.socket = null;
    this.eventHandlers = new Map();
    this.isConnecting = false;
    this.connectPromise = null;
  }

  /**
   * Conecta al servidor WebSocket.
   * Utiliza la lógica de reconexión interna de Socket.IO.
   * Devuelve una promesa que se resuelve cuando la conexión es exitosa.
   */
  connect() {
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    if (this.isConnecting) {
      return this.connectPromise;
    }

    this.isConnecting = true;
    
    // Limpieza de cualquier instancia anterior
    if (this.socket) {
        this.socket.close();
        this.socket.removeAllListeners();
    }

    this.connectPromise = new Promise((resolve, reject) => {
      console.log('🔌 Intentando conectar al servidor...');
      this.socket = io(import.meta.env.VITE_WS_URL, {
        reconnection: true, // Dejar que Socket.IO gestione la reconexión
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000, // Timeout para el handshake inicial
        transports: ['websocket', 'polling'], // Priorizar WebSocket
        forceNew: true, // Asegura una conexión limpia
      });

      this.socket.on('connect', () => {
        console.log('✅ Conectado exitosamente al servidor. ID:', this.socket.id);
        this.isConnecting = false;
        this.restoreEventHandlers(); // Restaurar listeners generales
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('❌ Desconectado del servidor:', reason);
        // Si el servidor nos desconectó, no intentará reconectar automáticamente.
        // Aquí podrías agregar lógica para notificar al usuario.
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔥 Error de conexión:', error.message);
        // Esto se dispara si todos los intentos de reconexión fallan
        this.isConnecting = false;
        reject(error);
      });

      // Restaurar los listeners que el usuario haya definido con .on()
      this.restoreEventHandlers();

    });

    return this.connectPromise;
  }
  
    /**
   * Helper privado para manejar la lógica de "petición-respuesta".
   * @param {string} eventName - El nombre del evento a emitir.
   * @param {string} responseEvent - El nombre del evento que esperamos como respuesta.
   * @param {object} data - Los datos a enviar.
   * @param {number} timeoutMs - Tiempo de espera en milisegundos.
   * @returns {Promise<any>}
   * @private
   */
    async _request(eventName, responseEvent, data, timeoutMs = 15000) { // <-- 1. Hacemos la función principal async
      // 2. Esperamos la conexión ANTES de crear la promesa para los listeners
      await this.ensureConnection();
  
      // 3. Ahora el executor es síncrono, como debe ser.
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
  
        console.log(`[EMIT] ${eventName}`, data);
        this.socket.emit(eventName, data);
      });
    }

  // --- MÉTODOS DE LA API (ahora mucho más limpios) ---

  createRoom(roomConfig) {
    // El servidor debe responder con 'roomCreated' o 'error'
    return this._request('createRoom', 'roomCreated', roomConfig);
  }

  joinRoom(roomCode, playerInfo) {
    return this._request('joinRoom', 'roomJoined', { roomCode, ...playerInfo });
  }

  setPlayerReady(roomCode) {
    return this._request('playerReady', 'playersUpdate', { roomCode });
  }

  startGame(data) {
    return this._request('startGame', 'gameStarted', data);
  }

  selectCategory(data) {
    return this._request('selectCategory', 'categorySelected', data);
  }

  startSong(data) {
    // A veces no necesitas una respuesta, solo confirmación. El servidor puede enviar 'songStarted'
    return this._request('startSong', 'songStarted', data);
  }

  submitPrediction(data) {
    return this._request('submitPrediction', 'predictionSubmitted', data);
  }

  markPlayerCorrect(data) {
    return this._request('markPlayerCorrect', 'playerMarked', data);
  }

  confirmCorrect(data) {
    return this._request('confirmCorrect', 'playerConfirmed',data);
  }

  enableMarking(data) {
    return this._request('enableMarking', 'markingEnabled', data);
  }

  disableMarking(data) {
    return this._request('disableMarking', 'markingDisabled', data);
  }

  gameOver(data) {
    return this._request('gameOver', 'gameOverConfirmed', data);
  }
  
  restartGame(data) {
    return this._request('restartGame', 'gameRestarted', data);
  }

  // --- Métodos que no necesitan respuesta (Fire-and-Forget) ---

  async revealSong(data) {
    await this.ensureConnection();
    this.socket.emit('revealSong', data);
  }

  async updateRoom(data) {
    await this.ensureConnection();
    this.socket.emit('updateRoom', data);
  }

  // --- GESTIÓN DE EVENTOS Y CONEXIÓN ---

  async ensureConnection() {
    if (!this.socket?.connected) {
      if (!this.isConnecting) {
        await this.connect();
      } else {
        await this.connectPromise;
      }
    }
  }

  // Para eventos que escuchas constantemente (ej. actualizaciones de estado)
  on(event, handler) {
    this.eventHandlers.set(event, handler);
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  off(event) {
    this.eventHandlers.delete(event);
    if (this.socket) {
      this.socket.off(event);
    }
  }

  restoreEventHandlers() {
    if (!this.socket) return;
    this.socket.removeAllListeners(); // Empezar de cero para evitar duplicados
    this.eventHandlers.forEach((handler, event) => {
      this.socket.on(event, handler);
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('Desconectando manualmente el socket.');
      this.socket.disconnect();
      this.socket = null;
      this.connectPromise = null;
      this.isConnecting = false;
    }
  }
}

export const gameSocket = new GameWebSocket();