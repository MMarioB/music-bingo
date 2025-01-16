import { io } from 'socket.io-client';

class GameWebSocket {
  constructor() {
    this.socket = null;
    this.eventHandlers = new Map();
    this.isConnecting = false;
    this.connected = false;
    this.connectionAttempts = 0;
    this.maxAttempts = 5;
    this.connectPromise = null;
    this.reconnectTimeout = null;
  }

  async connect() {
    if (this.socket?.connected) {
      console.log('Ya conectado');
      this.connected = true;
      return;
    }

    if (this.isConnecting) {
      console.log('Conexión en progreso...');
      return this.connectPromise;
    }

    this.isConnecting = true;

    this.connectPromise = new Promise((resolve, reject) => {
      try {
        if (this.socket) {
          this.socket.removeAllListeners();
          this.socket.disconnect();
          this.socket = null;
        }

        console.log('Intentando conectar al servidor...');
        this.socket = io(import.meta.env.VITE_WS_URL, {
          reconnection: false, // Manejamos la reconexión manualmente
          timeout: 10000,
          transports: ['websocket', 'polling'],
          forceNew: true,
          autoConnect: false
        });

        const cleanup = () => {
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
          }
          this.socket?.removeAllListeners();
        };

        const handleConnect = () => {
          console.log('Conectado exitosamente');
          this.connected = true;
          this.isConnecting = false;
          this.connectionAttempts = 0;
          this.restoreEventHandlers();
          cleanup();
          resolve();
        };

        const handleConnectError = (error) => {
          console.error('Error de conexión:', error);
          this.connectionAttempts++;
          
          if (this.connectionAttempts >= this.maxAttempts) {
            cleanup();
            this.isConnecting = false;
            reject(new Error('Se alcanzó el máximo de intentos de conexión'));
            return;
          }

          console.log(`Reintentando conexión ${this.connectionAttempts}/${this.maxAttempts}`);
          this.reconnectTimeout = setTimeout(() => {
            this.socket?.connect();
          }, 1000 * Math.min(this.connectionAttempts, 5));
        };

        const handleDisconnect = (reason) => {
          console.log('Desconectado:', reason);
          this.connected = false;
          
          if (reason === 'io server disconnect' || reason === 'transport close') {
            this.reconnectTimeout = setTimeout(() => {
              this.connect().catch(console.error);
            }, 1000);
          }
        };

        const handleError = (error) => {
          console.error('Error de socket:', error);
          this.socket?.emit('error', { message: error.message });
        };

        // Registrar listeners
        this.socket.on('connect', handleConnect);
        this.socket.on('connect_error', handleConnectError);
        this.socket.on('disconnect', handleDisconnect);
        this.socket.on('error', handleError);

        // Iniciar conexión
        this.socket.connect();

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });

    return this.connectPromise;
  }

  async ensureConnection() {
    if (!this.socket || !this.connected) {
      await this.connect();
    }
    
    if (!this.socket) {
      throw new Error('No se pudo establecer la conexión');
    }
    
    return true;
  }

  async createRoom(roomConfig) {
    await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('No hay conexión con el servidor'));
        return;
      }

      const timeout = setTimeout(() => {
        this.socket?.off('roomCreated', handleSuccess);
        this.socket?.off('error', handleError);
        reject(new Error('Tiempo de espera agotado al crear la sala'));
      }, 10000);

      const handleSuccess = (response) => {
        clearTimeout(timeout);
        this.socket?.off('error', handleError);
        resolve(response);
      };

      const handleError = (error) => {
        clearTimeout(timeout);
        this.socket?.off('roomCreated', handleSuccess);
        reject(error);
      };

      console.log('Creando sala:', roomConfig);
      this.socket.emit('createRoom', roomConfig);
      this.socket.once('roomCreated', handleSuccess);
      this.socket.once('error', handleError);
    });
  }

  async joinRoom(roomCode, playerInfo) {
    await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('No hay conexión con el servidor'));
        return;
      }

      const timeout = setTimeout(() => {
        this.socket?.off('roomJoined', handleSuccess);
        this.socket?.off('error', handleError);
        reject(new Error('Tiempo de espera agotado al unirse a la sala'));
      }, 10000);

      const handleSuccess = (response) => {
        clearTimeout(timeout);
        this.socket?.off('error', handleError);
        
        if (response.isReconnecting && response.phase === 'playing') {
          this.setPlayerReady(roomCode).catch(console.error);
        }
        
        resolve(response);
      };

      const handleError = (error) => {
        clearTimeout(timeout);
        this.socket?.off('roomJoined', handleSuccess);
        reject(error);
      };

      console.log('Uniéndose a sala:', roomCode, playerInfo);
      this.socket.emit('joinRoom', { roomCode, ...playerInfo });
      this.socket.once('roomJoined', handleSuccess);
      this.socket.once('error', handleError);
    });
  }

  async setPlayerReady(roomCode) {
    await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('No hay conexión con el servidor'));
        return;
      }

      const timeout = setTimeout(() => {
        this.socket?.off('playersUpdate', handleSuccess);
        this.socket?.off('error', handleError);
        reject(new Error('Tiempo de espera agotado al marcar jugador como listo'));
      }, 5000);

      const handleSuccess = (response) => {
        clearTimeout(timeout);
        this.socket?.off('error', handleError);
        resolve(response);
      };

      const handleError = (error) => {
        clearTimeout(timeout);
        this.socket?.off('playersUpdate', handleSuccess);
        reject(error);
      };

      this.socket.emit('playerReady', { roomCode });
      this.socket.once('playersUpdate', handleSuccess);
      this.socket.once('error', handleError);
    });
  }

  async startGame(data) {
    await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('No hay conexión con el servidor'));
        return;
      }

      const timeout = setTimeout(() => {
        this.socket?.off('gameStarted', handleSuccess);
        this.socket?.off('gameStartFailed', handleStartFailed);
        this.socket?.off('error', handleError);
        reject(new Error('Tiempo de espera agotado al iniciar el juego'));
      }, 15000);

      const handleSuccess = (response) => {
        clearTimeout(timeout);
        this.socket?.off('gameStartFailed', handleStartFailed);
        this.socket?.off('error', handleError);
        resolve(response);
      };

      const handleStartFailed = (error) => {
        clearTimeout(timeout);
        this.socket?.off('gameStarted', handleSuccess);
        this.socket?.off('error', handleError);
        reject(new Error(error.message));
      };

      const handleError = (error) => {
        clearTimeout(timeout);
        this.socket?.off('gameStarted', handleSuccess);
        this.socket?.off('gameStartFailed', handleStartFailed);
        reject(error);
      };

      console.log('Iniciando juego:', data);
      this.socket.emit('startGame', data);
      this.socket.once('gameStarted', handleSuccess);
      this.socket.once('gameStartFailed', handleStartFailed);
      this.socket.once('error', handleError);
    });
  }

  async emitWithAck(eventName, data, timeout = 10000) {
    await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('No hay conexión con el servidor'));
        return;
      }

      this.socket.timeout(timeout).emit(eventName, data, (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      });
    });
  }

  async selectCategory(data) {
    console.log('Seleccionando categoría:', data);
    return this.emitWithAck('selectCategory', data);
  }

  async revealSong(data) {
    console.log('Revelando canción:', data);
    return this.emitWithAck('revealSong', data);
  }

  async enableMarking(data) {
    console.log('Habilitando marcado:', data);
    return this.emitWithAck('enableMarking', data);
  }

  async disableMarking(data) {
    console.log('Deshabilitando marcado:', data);
    return this.emitWithAck('disableMarking', data);
  }

  async winner(data) {
    console.log('Anunciando ganador:', data);
    return this.emitWithAck('winner', data);
  }

  async updateRoom(data) {
    console.log('Actualizando sala:', data);
    return this.emitWithAck('updateRoom', data);
  }

  restoreEventHandlers() {
    if (!this.socket) return;
    this.eventHandlers.forEach((handler, event) => {
      this.socket.on(event, handler);
    });
  }

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

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.eventHandlers.clear();
    this.connected = false;
    this.isConnecting = false;
    this.connectionAttempts = 0;
    this.connectPromise = null;
  }
}

export const gameSocket = new GameWebSocket();