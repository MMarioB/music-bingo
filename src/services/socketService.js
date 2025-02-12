import SockJS from 'sockjs-client';

class GameWebSocket {
  constructor() {
    this.socket = null;
    this.eventHandlers = new Map();
    this.isConnecting = false;
    this.connected = false;
    this.connectionAttempts = 0;
    this.maxAttempts = 5;
    this.reconnectTimeout = null;
    this.pendingPromises = new Map();
    this.messageId = 0;
  }

  isConnected() {
    return this.socket && this.socket.readyState === SockJS.OPEN && this.connected;
  }

  async connect() {
    if (this.isConnected()) return Promise.resolve();
    if (this.isConnecting) {
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.isConnected()) {
            resolve();
          } else if (this.connectionAttempts >= this.maxAttempts) {
            reject(new Error('Máximo de intentos de conexión alcanzado'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    this.isConnecting = true;
    return new Promise((resolve, reject) => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          this.isConnecting = false;
          window.location.href = '/';
          return;
        }

        const wsUrl = `${import.meta.env.VITE_WS_URL}/socket?token=${token}`;
        console.log('Connecting to:', wsUrl);
        
        this.socket = new SockJS(wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (!this.connected) {
            this.isConnecting = false;
            this.socket.close();
            reject(new Error('Timeout en conexión inicial'));
          }
        }, 5000);

        this.socket.onopen = () => {
          console.log('WebSocket conectado');
          clearTimeout(connectionTimeout);
          this.connected = true;
          this.isConnecting = false;
          this.connectionAttempts = 0;
          resolve();
        };

        this.socket.onclose = async (event) => {
          console.log('WebSocket desconectado:', event.code);
          clearTimeout(connectionTimeout);
          this.connected = false;
          this.isConnecting = false;

          this.pendingPromises.forEach(({ reject: promiseReject }) => {
            promiseReject(new Error('Conexión cerrada'));
          });
          this.pendingPromises.clear();

          if (event.code === 1003 || event.code === 4001) {
            localStorage.removeItem('token');
            window.location.href = '/';
            return;
          }

          if (event.code === 1011) {
            if (this.connectionAttempts < 3) {
              console.log('Reconexión inmediata por código 1011');
              this.connectionAttempts++;
              await new Promise(resolve => setTimeout(resolve, 1000));
              this.reconnect();
            } else {
              console.log('Máximo de intentos de reconexión alcanzado para código 1011');
              this.notifyError('No se pudo establecer la conexión');
            }
          } else if (this.connectionAttempts < this.maxAttempts) {
            const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
            this.reconnectTimeout = setTimeout(() => this.reconnect(), delay);
          } else {
            console.log('Máximo de intentos de reconexión alcanzado');
            this.notifyError('Error de conexión: Máximo de intentos alcanzado');
          }
        };

        this.socket.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            console.log('Mensaje recibido:', data);

            if (data.messageId && this.pendingPromises.has(data.messageId)) {
              const { resolve: promiseResolve, reject: promiseReject } = this.pendingPromises.get(data.messageId);
              if (data.error) {
                promiseReject(new Error(data.error.message || 'Error desconocido'));
              } else {
                promiseResolve(data);
              }
              this.pendingPromises.delete(data.messageId);
              return;
            }

            if (data.error) {
              const handler = this.eventHandlers.get('error');
              if (handler) handler(data.error);
              return;
            }

            const handler = this.eventHandlers.get(data.event);
            if (handler) {
              handler(data);
            }
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };

        this.socket.onerror = (error) => {
          console.error('Error en WebSocket:', error);
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  async send(event, data) {
    const messageId = `msg_${++this.messageId}`;
    const maxSendAttempts = 3;
    let sendAttempts = 0;

    const attemptSend = async () => {
      if (sendAttempts >= maxSendAttempts) {
        throw new Error(`Máximo de intentos alcanzado para ${event}`);
      }

      if (!this.isConnected()) {
        try {
          await this.connect();
        } catch (error) {
          throw new Error(`Error de conexión: ${error.message}`);
        }
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingPromises.delete(messageId);
          sendAttempts++;
          if (sendAttempts < maxSendAttempts) {
            console.log(`Reintentando operación ${event}, intento ${sendAttempts + 1}`);
            attemptSend()
              .then(resolve)
              .catch(reject);
          } else {
            reject(new Error('Timeout en envío de mensaje'));
          }
        }, 5000);

        this.pendingPromises.set(messageId, {
          resolve: (data) => {
            clearTimeout(timeout);
            resolve(data);
          },
          reject: (error) => {
            clearTimeout(timeout);
            reject(error);
          }
        });

        try {
          this.socket.send(JSON.stringify({
            event,
            messageId,
            data
          }));
        } catch (error) {
          clearTimeout(timeout);
          this.pendingPromises.delete(messageId);
          reject(error);
        }
      });
    };

    return attemptSend();
  }

  async createRoom(roomConfig) {
    console.log('Creando sala:', roomConfig);
    const sanitizedConfig = {
      roomCode: roomConfig.roomCode,
      difficulty: roomConfig.difficulty,
      maxPlayers: roomConfig.maxPlayers || 12
    };
    
    // Eliminamos cualquier campo undefined
    Object.keys(sanitizedConfig).forEach(key => 
      sanitizedConfig[key] === undefined && delete sanitizedConfig[key]
    );
    
    console.log('Configuración sanitizada:', sanitizedConfig); // Para debug
    return this.sendWithResponse('createRoom', sanitizedConfig);
  }

  async joinRoom(roomCode, playerInfo) {
    console.log('Intentando unirse a sala:', roomCode, playerInfo);
    return this.sendWithResponse('joinRoom', { roomCode, ...playerInfo });
  }

  async setPlayerReady(roomCode) {
    console.log('Marcando jugador como listo:', roomCode);
    return this.sendWithResponse('playerReady', { roomCode });
  }

  async checkRoom(roomCode) {
    console.log('Verificando existencia de sala:', roomCode);
    try {
      const response = await this.sendWithResponse('checkRoom', { roomCode });
      return response.exists;
    } catch (error) {
      console.error('Error verificando sala:', error);
      return false;
    }
  }

  async startGame(options) {
    console.log('Iniciando juego:', options);
    const gameConfig = {
      roomCode: options.roomCode,
      difficulty: options.difficulty,
      phase: 'playing'
    };
    
    try {
      // Intentamos asegurar la conexión antes de enviar
      if (!this.isConnected()) {
        await this.connect();
      }
      return await this.sendWithResponse('startGame', gameConfig);
    } catch (error) {
      console.error('Error al iniciar el juego:', error);
      // Si hay un error de conexión, intentamos reconectar una vez más
      if (error.message.includes('Conexión cerrada') || error.message.includes('Desconexión manual')) {
        await this.connect();
        return this.sendWithResponse('startGame', gameConfig);
      }
      throw error;
    }
  }

  async selectCategory(data) {
    console.log('Seleccionando categoría:', data);
    return this.sendWithResponse('selectCategory', data);
  }

  async revealSong(data) {
    console.log('Revelando canción:', data);
    return this.sendWithResponse('revealSong', data);
  }

  async enableMarking(data) {
    console.log('Habilitando marcado:', data);
    try {
      const response = await this.sendWithResponse('enableMarking', {
        roomCode: data.roomCode
      });
      // Esperamos tanto un evento de éxito como el evento markingEnabled
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.off('markingEnabled');
          reject(new Error('Timeout al habilitar marcado'));
        }, 15000); // Aumentamos el timeout a 15 segundos
  
        const handleMarkingEnabled = () => {
          clearTimeout(timeout);
          this.off('markingEnabled');
          resolve(response);
        };
  
        this.on('markingEnabled', handleMarkingEnabled);
      });
    } catch (error) {
      console.error('Error en enableMarking:', error);
      throw error;
    }
  }

  async disableMarking(data) {
    console.log('Deshabilitando marcado:', data);
    return this.sendWithResponse('disableMarking', data);
  }

  async winner(data) {
    console.log('Anunciando ganador:', data);
    return this.sendWithResponse('winner', data);
  }

  async updateRoom(data) {
    console.log('Actualizando sala:', data);
    return this.sendWithResponse('updateRoom', data);
  }

  async updateGameState(data) {
    console.log('Actualizando estado del juego:', data);
    return this.sendWithResponse('updateGameState', data);
  }

  async sendWithResponse(event, data) {
    try {
      const response = await this.send(event, data);
      if (response.error) {
        throw new Error(response.error.message || 'Error desconocido');
      }
      return response;
    } catch (error) {
      if (error.message.includes('Conexión cerrada')) {
        await this.connect();
        return this.sendWithResponse(event, data);
      }
      throw new Error(`Error en ${event}: ${error.message}`);
    }
  }

  notifyError(message) {
    const handler = this.eventHandlers.get('error');
    if (handler) {
      handler({ message });
    }
  }

  async reconnect() {
    if (this.isConnecting) return;
    try {
      await this.connect();
    } catch (error) {
      console.error('Error en reconexión:', error);
      this.notifyError('Error de reconexión');
    }
  }

  disconnect() {
    console.log('Llamada a disconnect. Stack:', new Error().stack);
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.pendingPromises.forEach(({ reject }) => {
      reject(new Error('Desconexión manual'));
    });
    this.pendingPromises.clear();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
      this.isConnecting = false;
      this.connectionAttempts = 0;
    }
  }

  on(event, handler) {
    this.eventHandlers.set(event, handler);
  }

  off(event) {
    this.eventHandlers.delete(event);
  }
}

export const gameSocket = new GameWebSocket();