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
    this.connectionQueue = [];
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
    this.connectionAttempts++;
  
    this.connectPromise = new Promise((resolve, reject) => {
      try {
        if (this.socket) {
          this.socket.close();
          this.socket.removeAllListeners();
        }
  
        console.log('Intentando conectar al servidor...');
        this.socket = io(import.meta.env.VITE_WS_URL, {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000,
          transports: ['polling', 'websocket'],
          forceNew: true,
          autoConnect: false
        });
  
        let attemptCount = 0;
        const maxAttempts = 3;
        const attemptConnection = () => {
          if (attemptCount >= maxAttempts) {
            this.isConnecting = false;
            reject(new Error('Max connection attempts reached'));
            return;
          }
  
          console.log(`Intento de conexión ${attemptCount + 1}/${maxAttempts}`);
          this.socket.connect();
  
          const timeout = setTimeout(() => {
            if (!this.connected) {
              console.log(`Timeout en intento ${attemptCount + 1}`);
              this.socket.disconnect();
              attemptCount++;
              attemptConnection();
            }
          }, 5000);
  
          this.socket.once('connect', () => {
            console.log('Conectado exitosamente');
            clearTimeout(timeout);
            this.connected = true;
            this.isConnecting = false;
            this.connectionAttempts = 0;
            this.restoreEventHandlers();
            
            this.processConnectionQueue();
            
            resolve();
          });
  
          this.socket.once('connect_error', (error) => {
            console.error(`Error de conexión en intento ${attemptCount + 1}:`, error);
            clearTimeout(timeout);
            this.socket.disconnect();
            attemptCount++;
            attemptConnection();
          });
        };
  
        this.socket.on('disconnect', (reason) => {
          console.log('Desconectado:', reason);
          this.connected = false;
          if (reason === 'io server disconnect') {
            attemptConnection();
          }
        });
  
        attemptConnection();
  
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  
    return this.connectPromise;
  }

  async createRoom(roomConfig) {
    await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout creating room'));
      }, 10000);

      const handleRoomCreated = (roomInfo) => {
        clearTimeout(timeout);
        this.socket.off('error', handleError);
        resolve(roomInfo);
      };

      const handleError = (error) => {
        clearTimeout(timeout);
        this.socket.off('roomCreated', handleRoomCreated);
        reject(error);
      };

      console.log('Creando sala:', roomConfig);
      this.socket.emit('createRoom', roomConfig);
      this.socket.once('roomCreated', handleRoomCreated);
      this.socket.once('error', handleError);
    });
  }

  async joinRoom(roomCode, playerInfo) {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout joining room'));
      }, 10000);

      const handleRoomJoined = (roomInfo) => {
        clearTimeout(timeout);
        this.socket.off('error', handleError);
        
        if (roomInfo.isReconnecting && roomInfo.phase === 'playing') {
          this.setPlayerReady(roomCode).catch(console.error);
        }
        
        resolve(roomInfo);
      };

      const handleError = (error) => {
        clearTimeout(timeout);
        this.socket.off('roomJoined', handleRoomJoined);
        reject(error);
      };

      console.log('Intentando unirse a sala:', roomCode, playerInfo);
      this.socket.emit('joinRoom', { roomCode, ...playerInfo });
      this.socket.once('roomJoined', handleRoomJoined);
      this.socket.once('error', handleError);
    });
  }

  async startSong(data) {
    await this.ensureConnection();
    console.log('Iniciando reproducción:', data);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout starting song'));
      }, 5000);

      const handleSongStarted = () => {
        clearTimeout(timeout);
        this.socket.off('error', handleError);
        resolve();
      };

      const handleError = (error) => {
        clearTimeout(timeout);
        this.socket.off('songStarted', handleSongStarted);
        reject(error);
      };

      this.socket.emit('startSong', data);
      this.socket.once('songStarted', handleSongStarted);
      this.socket.once('error', handleError);
    });
  }

  async submitPrediction(data) {
    await this.ensureConnection();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout submitting prediction'));
      }, 5000);

      const handlePredictionSubmitted = () => {
        clearTimeout(timeout);
        this.socket.off('error', handleError);
        resolve();
      };

      const handleError = (error) => {
        clearTimeout(timeout);
        this.socket.off('predictionSubmitted', handlePredictionSubmitted);
        reject(error);
      };

      this.socket.emit('submitPrediction', data);
      this.socket.once('predictionSubmitted', handlePredictionSubmitted);
      this.socket.once('error', handleError);
    });
  }

  processConnectionQueue() {
    while (this.connectionQueue.length > 0) {
      const { resolve, reject, fn } = this.connectionQueue.shift();
      fn().then(resolve).catch(reject);
    }
  }

  async setPlayerReady(roomCode) {
    await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout setting player ready'));
      }, 5000);

      const handlePlayersUpdate = (data) => {
        clearTimeout(timeout);
        this.socket.off('error', handleError);
        resolve(data);
      };

      const handleError = (error) => {
        clearTimeout(timeout);
        this.socket.off('playersUpdate', handlePlayersUpdate);
        reject(error);
      };

      this.socket.emit('playerReady', { roomCode });
      this.socket.once('playersUpdate', handlePlayersUpdate);
      this.socket.once('error', handleError);
    });
  }

  async startGame(data) {
    await this.ensureConnection();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout starting game'));
      }, 15000);

      const handleGameStarted = (gameInfo) => {
        clearTimeout(timeout);
        this.socket.off('error', handleError);
        this.socket.off('gameStartFailed', handleStartFailed);
        resolve(gameInfo);
      };

      const handleStartFailed = (error) => {
        clearTimeout(timeout);
        this.socket.off('gameStarted', handleGameStarted);
        this.socket.off('error', handleError);
        reject(new Error(error.message));
      };

      const handleError = (error) => {
        clearTimeout(timeout);
        this.socket.off('gameStarted', handleGameStarted);
        this.socket.off('gameStartFailed', handleStartFailed);
        reject(error);
      };

      console.log('Iniciando juego:', data);
      this.socket.emit('startGame', data);
      this.socket.once('gameStarted', handleGameStarted);
      this.socket.once('gameStartFailed', handleStartFailed);
      this.socket.once('error', handleError);
    });
  }

  async selectCategory(data) {
    await this.ensureConnection();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout selecting category'));
      }, 10000);

      const handleCategorySelected = (response) => {
        clearTimeout(timeout);
        resolve(response);
      };

      console.log('Seleccionando categoría:', data);
      this.socket.emit('selectCategory', data);
      this.socket.once('categorySelected', handleCategorySelected);
    });
  }

  async revealSong(data) {
    await this.ensureConnection();
    console.log('Revelando canción:', data);
    this.socket.emit('revealSong', data);
  }

  async enableMarking(data) {
    await this.ensureConnection();
    console.log('Habilitando marcado:', data);
    this.socket.emit('enableMarking', data);
  }

  async disableMarking(data) {
    await this.ensureConnection();
    console.log('Deshabilitando marcado:', data);
    this.socket.emit('disableMarking', data);
  }

  async winner(data) {
    await this.ensureConnection();
    console.log('Anunciando ganador:', data);
    this.socket.emit('winner', data);
  }

  async updateRoom(data) {
    await this.ensureConnection();
    console.log('Actualizando sala:', data);
    this.socket.emit('updateRoom', data);
  }

  restoreEventHandlers() {
    if (!this.socket) return;
    this.eventHandlers.forEach((handler, event) => {
      this.socket.on(event, handler);
    });
  }

  async ensureConnection() {
    if (!this.connected) {
      await this.connect();
    }
    return true;
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
    if (this.socket) {
      this.socket.disconnect();
      this.eventHandlers.clear();
      this.socket = null;
      this.connected = false;
      this.isConnecting = false;
      this.connectionAttempts = 0;
      this.connectPromise = null;
    }
  }
}

export const gameSocket = new GameWebSocket();