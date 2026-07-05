import { io } from 'socket.io-client';

const IS_DEV = import.meta.env.DEV;

class GameWebSocket {
  constructor() {
    this.socket = null;
    this.eventHandlers = new Map();
    this.isConnecting = false;
    this.connectPromise = null;
    this.lastRoomData = null;
    this.reconnectionAttempts = 0;
    this.maxReconnectionAttempts = 3;
    this.serverWaking = false;
    this.connectionStartTime = null;
  }

  connect() {
    if (this.socket && this.socket.connected) return Promise.resolve();
    if (this.isConnecting) return this.connectPromise;

    if (this.socket && !this.socket.connected) {
      return new Promise((resolve) => {
        const onConnect = () => {
          this.socket.off('connect', onConnect);
          resolve();
        };

        this.socket.once('connect', onConnect);

        setTimeout(() => {
          if (!this.socket.connected) {
            this.socket.off('connect', onConnect);
            this.socket.close();
            this.socket = null;
            this.connect().then(resolve);
          }
        }, 5000);
      });
    }

    this.isConnecting = true;
    this.connectionStartTime = Date.now();

    this.connectPromise = new Promise((resolve, reject) => {
      const wakingCheckTimer = setTimeout(() => {
        if (this.isConnecting && !this.serverWaking) {
          this.serverWaking = true;
          this._notifyServerWaking();
        }
      }, 3000);

      this.socket = io(import.meta.env.VITE_WS_URL, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 30000,
        transports: ['websocket', 'polling'],
        forceNew: true,
      });

      this.socket.on('connect', async () => {
        clearTimeout(wakingCheckTimer);

        if (this.serverWaking) {
          this._notifyServerAwake();
          this.serverWaking = false;
        }

        this.isConnecting = false;
        this.reconnectionAttempts = 0;
        this.restoreEventHandlers();

        if (this.lastRoomData) {
          try {
            await this._rejoinRoom();
          } catch (error) {
            console.error('Error en auto-rejoin:', error);
            this._handleRejoinFailure(error);
          }
        }

        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        if (IS_DEV) console.warn('Desconectado del servidor:', reason);
        if (reason === 'io server disconnect') {
          this._handleServerDisconnect();
        }
      });

      this.socket.on('hostDisconnected', (data) => {
        this._showHostDisconnectedMessage(data.message);
      });

      this.socket.on('hostReconnected', () => {
        this._hideHostDisconnectedMessage();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Error de conexión:', error.message);
        this.isConnecting = false;
        reject(error);
      });
    });

    return this.connectPromise;
  }

  async _rejoinRoom() {
    if (!this.lastRoomData) return;

    this.reconnectionAttempts++;

    try {
      const response = await this._emit(
        'joinRoom',
        { ...this.lastRoomData, reconnecting: true },
        true,
        10000
      );

      if (response && response.error) {
        throw new Error(response.error);
      }

      this.reconnectionAttempts = 0;
      return response;

    } catch (error) {
      console.error(`Rejoin falló (intento ${this.reconnectionAttempts}):`, error.message);
      throw error;
    }
  }

  _handleRejoinFailure(error) {
    if (IS_DEV) console.log('Rejoin failure:', error);
    if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
      console.error('Máximo de intentos de reconexión alcanzado');
      this.lastRoomData = null;
      this._showReconnectionFailedMessage();
      return;
    }

    const delay = Math.min(2000 * Math.pow(2, this.reconnectionAttempts - 1), 10000);

    setTimeout(async () => {
      try {
        await this._rejoinRoom();
      } catch (retryError) {
        this._handleRejoinFailure(retryError);
      }
    }, delay);
  }

  _handleServerDisconnect() {
    this.lastRoomData = null;
    this._showServerDisconnectMessage();
  }

  _showHostDisconnectedMessage(message) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hostDisconnected', { detail: { message } }));
    }
  }

  _hideHostDisconnectedMessage() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hostReconnected'));
    }
  }

  _showReconnectionFailedMessage() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('reconnectionFailed'));
      setTimeout(() => { window.location.href = '/'; }, 3000);
    }
  }

  _showServerDisconnectMessage() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('serverDisconnect'));
      setTimeout(() => { window.location.href = '/'; }, 2000);
    }
  }

  _notifyServerWaking() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('serverWaking', {
        detail: { message: '⏳ El servidor está despertando, esto puede tomar unos segundos...' }
      }));
    }
  }

  _notifyServerAwake() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('serverAwake'));
    }
  }

  async _emit(eventName, data, expectResponse = false, timeoutMs = 15000) {
    try {
      await this.ensureConnection();
    } catch (error) {
      console.error(`Error al asegurar conexión para ${eventName}:`, error);
      if (expectResponse) {
        throw error;
      }
      return;
    }

    if (expectResponse) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout: ${eventName}`));
        }, timeoutMs);

        this.socket.emit(eventName, data, (response) => {
          clearTimeout(timeout);
          if (response && response.error) {
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

  // Token secreto del host: permite reclamar el rol de anfitrión al
  // reconectar (incluso tras refrescar la página) sin que un tercero
  // pueda secuestrar la sala
  _storeHostToken(roomCode, token) {
    try {
      sessionStorage.setItem(`musicbingo-host-token-${roomCode}`, token);
    } catch { /* storage no disponible */ }
  }

  _getHostToken(roomCode) {
    try {
      return sessionStorage.getItem(`musicbingo-host-token-${roomCode}`);
    } catch {
      return null;
    }
  }

  // --- MÉTODOS QUE ESPERAN RESPUESTA (callback) ---
  async createRoom(roomConfig) {
    this.lastRoomData = {
      roomCode: roomConfig.roomCode,
      name: 'Game Master',
      isHost: true
    };
    const response = await this._emit('createRoom', roomConfig, true);
    if (response && response.hostToken && response.roomCode) {
      this._storeHostToken(response.roomCode, response.hostToken);
      this.lastRoomData = {
        roomCode: response.roomCode,
        name: 'Game Master',
        isHost: true,
        hostToken: response.hostToken
      };
    }
    return response;
  }

  joinRoom(roomCode, playerInfo) {
    const data = { roomCode, ...playerInfo };
    if (data.isHost && !data.hostToken) {
      const token = this._getHostToken(roomCode);
      if (token) data.hostToken = token;
    }
    this.lastRoomData = data;
    return this._emit('joinRoom', data, true);
  }

  selectCategory(data) { return this._emit('selectCategory', data, true); }
  startSong(data) { return this._emit('startSong', data, true); }
  declareWinner(data) { return this._emit('declareWinner', data, true); }
  markPlayerCorrect(data) { return this._emit('markPlayerCorrect', data, true); }

  async enableMarking(data) {
    try {
      return await this._emit('enableMarking', data, true, 10000);
    } catch (error) {
      if (error.message.includes('Sala no encontrada') && this.lastRoomData && this.lastRoomData.isHost) {
        try {
          await this._rejoinRoom();
          return await this._emit('enableMarking', data, true, 5000);
        } catch (rejoinError) {
          console.error('Fallo al reconectar:', rejoinError.message);
        }
      }
      throw error;
    }
  }

  async disableMarking(data) {
    try {
      return await this._emit('disableMarking', data, true, 10000);
    } catch (error) {
      if (error.message.includes('Sala no encontrada') && this.lastRoomData && this.lastRoomData.isHost) {
        try {
          await this._rejoinRoom();
          return await this._emit('disableMarking', data, true, 5000);
        } catch (rejoinError) {
          console.error('Fallo al reconectar:', rejoinError.message);
        }
      }
      throw error;
    }
  }

  async submitPrediction(data) { await this._emit('submitPrediction', data, false); }
  async setPlayerReady(roomCode) { await this._emit('playerReady', { roomCode }, false); }
  async startGame(data) { await this._emit('startGame', data, false); }
  async revealSong(data) { await this._emit('revealSong', data, false); }
  async updateRoom(data) { await this._emit('updateRoom', data, false); }
  async winner(data) { await this._emit('winner', data, false); }
  async gameOver(data) { await this._emit('gameOver', data, false); }
  restartGame(data) { return this._emit('restartGame', data, true, 10000); }
  setController(data) { return this._emit('setController', data, true); }
  async sendControllerAction(data) { await this._emit('controllerAction', data, false); }

  // --- GESTIÓN DE EVENTOS Y CONEXIÓN ---
  async ensureConnection() {
    if (!this.socket || !this.socket.connected) {
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

  clearRoomData() {
    this.lastRoomData = null;
    this.reconnectionAttempts = 0;
  }

  hasRoomData() { return !!this.lastRoomData; }
  getRoomData() { return this.lastRoomData ? { ...this.lastRoomData } : null; }

  disconnect() {
    if (this.socket) {
      this.clearRoomData();
      this.socket.disconnect();
      this.socket = null;
      this.connectPromise = null;
      this.isConnecting = false;
    }
  }

  async forceReconnect() {
    this.disconnect();
    return await this.connect();
  }

  getConnectionState() {
    return {
      connected: this.socket ? this.socket.connected : false,
      connecting: this.isConnecting,
      serverWaking: this.serverWaking,
      hasRoomData: this.hasRoomData(),
      reconnectionAttempts: this.reconnectionAttempts,
      socketId: this.socket ? this.socket.id : null
    };
  }
}

export const gameSocket = new GameWebSocket();
