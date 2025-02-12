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
        console.log('Intentando conectar al servidor...', wsUrl);
        
        this.socket = new SockJS(wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (!this.connected) {
            this.isConnecting = false;
            this.socket.close();
            reject(new Error('Timeout en conexión inicial'));
          }
        }, 20000);

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

          // Solo manejamos las promesas pendientes si no es una desconexión controlada
          if (event.code !== 1000) {
            this.pendingPromises.forEach(({ reject: promiseReject }) => {
              promiseReject(new Error('Conexión cerrada'));
            });
            this.pendingPromises.clear();

            if (this.connectionAttempts < this.maxAttempts) {
              const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 5000);
              this.reconnectTimeout = setTimeout(() => this.reconnect(), delay);
            }
          } else {
            // Si es una desconexión controlada, resolvemos las promesas pendientes
            this.pendingPromises.forEach(({ resolve }) => {
              resolve({ status: 'disconnected' });
            });
            this.pendingPromises.clear();
          }
        };

        this.socket.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            console.log('Mensaje recibido:', data);

            // Priorizar eventos de estado del juego
            if (data.event === 'gameStarted' || data.event === 'gameStateUpdated') {
              const handler = this.eventHandlers.get(data.event);
              if (handler) {
                handler(data);
                // Para gameStarted, también marcamos automáticamente como ready
                if (data.event === 'gameStarted') {
                  const roomCode = data.roomCode || data.config?.roomCode;
                  if (roomCode) {
                    this.setPlayerReady(roomCode).catch(console.error);
                  }
                }
              }
              return;
            }

            // Si es una respuesta a un mensaje específico
            if (data.messageId && this.pendingPromises.has(data.messageId)) {
              const { resolve, reject } = this.pendingPromises.get(data.messageId);
              if (data.error) {
                reject(new Error(data.error.message || 'Error desconocido'));
              } else {
                resolve(data);
              }
              this.pendingPromises.delete(data.messageId);
              return;
            }

            // Para otros eventos
            if (data.event) {
              const handler = this.eventHandlers.get(data.event);
              if (handler) {
                handler(data);
              }
            }
          } catch (error) {
            console.error('Error procesando mensaje:', error);
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
          if (this.pendingPromises.has(messageId)) {
            this.pendingPromises.delete(messageId);
            sendAttempts++;
            if (sendAttempts < maxSendAttempts) {
              console.log(`Reintentando operación ${event}, intento ${sendAttempts + 1}`);
              attemptSend()
                .then(resolve)
                .catch(reject);
            } else {
              reject(new Error(`Timeout en ${event} después de ${maxSendAttempts} intentos`));
            }
          }
        }, 20000);

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
          const message = {
            event,
            messageId,
            data
          };
          this.socket.send(JSON.stringify(message));
          console.log(`Mensaje enviado para ${event}:`, message);
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
    try {
      if (!this.isConnected()) {
        await this.connect();
      }
      const sanitizedConfig = {
        roomCode: roomConfig.roomCode,
        difficulty: roomConfig.difficulty,
        maxPlayers: roomConfig.maxPlayers || 12
      };
      return await this.sendWithResponse('createRoom', sanitizedConfig);
    } catch (error) {
      throw new Error(`Error al crear sala: ${error.message}`);
    }
  }

  async joinRoom(roomCode, playerInfo) {
    console.log('Intentando unirse a sala:', roomCode, playerInfo);
    try {
      const response = await this.sendWithResponse('joinRoom', { 
        roomCode, 
        ...playerInfo,
        reconnecting: this.connectionAttempts > 0
      });

      // Si es una reconexión y el juego está en curso, automáticamente marcamos como ready
      if (response.phase === 'playing') {
        try {
          await this.setPlayerReady(roomCode);
        } catch (error) {
          console.error('Error al marcar ready en reconexión:', error);
        }
      }

      return response;
    } catch (error) {
      console.error('Error en joinRoom:', error);
      throw error;
    }
  }

  async setPlayerReady(roomCode) {
    console.log('Marcando jugador como listo:', roomCode);
    return this.sendWithResponse('playerReady', { roomCode });
  }

  async startGame(options) {
    console.log('Iniciando juego:', options);
    try {
      const response = await this.sendWithResponse('startGame', {
        roomCode: options.roomCode,
        difficulty: options.difficulty
      });

      // Esperamos un poco antes de continuar para asegurar sincronización
      await new Promise(resolve => setTimeout(resolve, 1000));
      return response;
    } catch (error) {
      console.error('Error en startGame:', error);
      throw error;
    }
  }

  async selectCategory(data) {
    console.log('Seleccionando categoría:', data);
    return this.sendWithResponse('selectCategory', {
      roomCode: data.roomCode,
      category: data.category
    });
  }

  async revealSong(data) {
    console.log('Revelando canción:', data);
    return this.sendWithResponse('revealSong', {
      roomCode: data.roomCode,
      songData: data.songData
    });
  }

  async enableMarking(data) {
    console.log('Habilitando marcado:', data);
    return this.sendWithResponse('enableMarking', {
      roomCode: data.roomCode
    });
  }

  async disableMarking(data) {
    console.log('Deshabilitando marcado:', data);
    return this.sendWithResponse('disableMarking', {
      roomCode: data.roomCode
    });
  }

  async winner(data) {
    console.log('Anunciando ganador:', data);
    return this.sendWithResponse('winner', data);
  }

  async updateRoom(data) {
    console.log('Actualizando sala:', data);
    return this.sendWithResponse('updateRoom', {
      roomCode: data.roomCode,
      difficulty: data.difficulty
    });
  }

  async updateGameState(data) {
    console.log('Actualizando estado del juego:', data);
    return this.sendWithResponse('updateGameState', {
      roomCode: data.roomCode,
      currentCard: data.currentCard
    });
  }

  async sendWithResponse(event, data) {
    try {
      const response = await Promise.race([
        this.send(event, data),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout en ${event}`)), 20000)
        )
      ]);

      if (response.error) {
        throw new Error(response.error.message || 'Error desconocido');
      }

      // Si es un evento crítico, esperamos un poco para asegurar sincronización
      if (['startGame', 'joinRoom', 'playerReady'].includes(event)) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      return response;
    } catch (error) {
      if (error.message.includes('Conexión cerrada')) {
        await this.connect();
        return this.sendWithResponse(event, data);
      }
      throw error;
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
      this.connectionAttempts++;
      await this.connect();
    } catch (error) {
      console.error('Error en reconexión:', error);
      this.notifyError('Error de reconexión');
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close(1000, 'Desconexión normal');
      this.socket = null;
      this.connected = false;
      this.isConnecting = false;
      this.connectionAttempts = 0;
      this.pendingPromises.clear();
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