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
       if (this.isConnected()) return;
       if (this.isConnecting) return;

       this.isConnecting = true;

       try {
           const token = localStorage.getItem('token');
           if (!token) {
               window.location.href = '/';
               return;
           }

           const wsUrl = `${import.meta.env.VITE_WS_URL}/socket?token=${token}`;
           console.log('Connecting to:', wsUrl);
           
           this.socket = new SockJS(wsUrl);

           this.socket.onopen = () => {
               console.log('WebSocket conectado');
               this.connected = true;
               this.isConnecting = false;
               this.connectionAttempts = 0;
               this.restoreEventHandlers();
               // Resolver promesas pendientes si hay reconexión
               this.pendingPromises.forEach(({ resolve }) => {
                   resolve();
               });
               this.pendingPromises.clear();
           };

           this.socket.onclose = (event) => {
               console.log('WebSocket desconectado:', event.code);
               this.connected = false;
               this.isConnecting = false;

               // Rechazar todas las promesas pendientes en caso de desconexión
               this.pendingPromises.forEach(({ reject }) => {
                   reject(new Error('Conexión perdida'));
               });
               this.pendingPromises.clear();

               if (event.code === 1003 || event.code === 4001) {
                   localStorage.removeItem('token');
                   window.location.href = '/';
               } else if (this.connectionAttempts < this.maxAttempts) {
                   const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 30000);
                   this.reconnectTimeout = setTimeout(() => this.reconnect(), delay);
               }
           };

           this.socket.onmessage = (e) => {
               try {
                   const data = JSON.parse(e.data);
                   console.log('Mensaje recibido:', data);
                   
                   // Manejar errores globales
                   if (data.error || data.message) {
                       const handler = this.eventHandlers.get('error');
                       if (handler) handler(data);
                       return;
                   }

                   // Resolver promesa pendiente si existe
                   if (data.messageId && this.pendingPromises.has(data.messageId)) {
                       const { resolve } = this.pendingPromises.get(data.messageId);
                       resolve(data);
                       this.pendingPromises.delete(data.messageId);
                       return;
                   }

                   // Manejar eventos normales
                   const handler = this.eventHandlers.get(data.event);
                   if (handler) {
                       if (data.event === 'playersUpdate') {
                           handler({ players: data.players });
                       } else {
                           handler(data);
                       }
                   }
               } catch (error) {
                   console.error('Error parsing message:', error);
               }
           };
       } catch (error) {
           this.isConnecting = false;
           throw error;
       }
   }

   async send(event, data) {
       const messageId = `msg_${++this.messageId}`;
       await this.ensureConnection();
       
       if (!this.isConnected()) {
           throw new Error('Socket not ready');
       }

       const message = JSON.stringify({
           event,
           data,
           messageId
       });

       this.socket.send(message);
       return messageId;
   }

   async createRoom(roomConfig) {
       console.log('Creando sala:', roomConfig);
       return this.sendWithResponse('createRoom', roomConfig, 'roomCreated', 'error');
   }

   async joinRoom(roomCode, playerInfo) {
       console.log('Intentando unirse a sala:', roomCode, playerInfo);
       return this.sendWithResponse('joinRoom', { roomCode, ...playerInfo }, 'roomJoined', 'error');
   }

   async setPlayerReady(roomCode) {
    console.log('Marcando jugador como listo:', roomCode);
    try {
        // Primero verificar si la sala existe
        const roomExists = await this.checkRoom(roomCode);
        if (!roomExists) {
            throw new Error('Sala no encontrada');
        }
        return this.sendWithResponse('playerReady', { roomCode }, 'playersUpdate', 'error');
    } catch (error) {
        console.error('Error en setPlayerReady:', error);
        // Si es un error de sala no encontrada, emitimos un evento específico
        if (error.message.includes('Sala no encontrada')) {
            const handler = this.eventHandlers.get('roomNotFound');
            if (handler) {
                handler();
            }
        }
        throw error;
    }
}

   async startGame(options) {
       console.log('Iniciando juego:', options);
       return this.sendWithResponse('startGame', options, 'gameStarted', 'gameStartFailed');
   }

   async selectCategory(data) {
       console.log('Seleccionando categoría:', data);
       return this.sendWithResponse('selectCategory', data, 'categorySelected', 'error');
   }

   async revealSong(data) {
       console.log('Revelando canción:', data);
       return this.sendWithResponse('revealSong', data, 'songRevealed', 'error');
   }

   async enableMarking(data) {
       console.log('Habilitando marcado:', data);
       return this.sendWithResponse('enableMarking', data, 'markingEnabled', 'error');
   }

   async disableMarking(data) {
       console.log('Deshabilitando marcado:', data);
       return this.sendWithResponse('disableMarking', data, 'markingDisabled', 'error');
   }

   async winner(data) {
       console.log('Anunciando ganador:', data);
       return this.sendWithResponse('winner', data, 'winnerAnnounced', 'error');
   }

   async checkRoom(roomCode) {
    console.log('Verificando existencia de sala:', roomCode);
    try {
        const response = await this.sendWithResponse(
            'checkRoom', 
            { roomCode }, 
            'roomStatus',
            'error'
        );
        return response.exists;
    } catch (error) {
        console.error('Error verificando sala:', error);
        // Si el error es específicamente "Sala no encontrada", retornamos false
        if (error.message.includes('Sala no encontrada')) {
            return false;
        }
        // Si es otro tipo de error, lo propagamos
        throw error;
    }
}

async sendWithResponse(event, data, successEvent, errorEvent = 'error') {
  return new Promise((resolve, reject) => {
      const messageId = `msg_${++this.messageId}`;
      const timeout = setTimeout(() => {
          this.pendingPromises.delete(messageId);
          this.off(successEvent);
          this.off(errorEvent);
          reject(new Error('Timeout en la operación'));
      }, 10000);

      const successHandler = (response) => {
          clearTimeout(timeout);
          this.pendingPromises.delete(messageId);
          this.off(successEvent);
          this.off(errorEvent);
          
          // Verificar si la respuesta indica que la sala no existe
          if (response.error === 'ROOM_NOT_FOUND') {
              const handler = this.eventHandlers.get('roomNotFound');
              if (handler) {
                  handler();
              }
              reject(new Error('Sala no encontrada'));
              return;
          }
          
          resolve(response);
      };

      const errorHandler = (error) => {
          clearTimeout(timeout);
          this.pendingPromises.delete(messageId);
          this.off(successEvent);
          this.off(errorEvent);
          
          // Verificar si el error está relacionado con la sala no encontrada
          if (error.message?.includes('ROOM_NOT_FOUND') || 
              error.code === 'ROOM_NOT_FOUND' ||
              error.message?.includes('Sala no encontrada')) {
              const handler = this.eventHandlers.get('roomNotFound');
              if (handler) {
                  handler();
              }
          }
          
          reject(new Error(error.message || 'Error desconocido'));
      };

      this.pendingPromises.set(messageId, { resolve: successHandler, reject: errorHandler });
      this.on(successEvent, successHandler);
      this.on(errorEvent, errorHandler);

      this.ensureConnection()
          .then(() => this.send(event, { ...data, messageId }))
          .catch(errorHandler);
  });
}

   async reconnect() {
       if (this.isConnecting) return;
       this.connectionAttempts++;
       console.log(`Intento de reconexión ${this.connectionAttempts}/${this.maxAttempts}`);
       
       try {
           await this.connect();
       } catch (error) {
           console.error('Error en reconexión:', error);
           const handler = this.eventHandlers.get('error');
           if (handler) {
               handler({ message: 'Error de reconexión' });
           }
       }
   }

   async ensureConnection() {
       if (!this.isConnected()) {
           return new Promise((resolve, reject) => {
               const messageId = `conn_${++this.messageId}`;
               const timeout = setTimeout(() => {
                   this.pendingPromises.delete(messageId);
                   reject(new Error('Timeout en conexión'));
               }, 10000);

               this.pendingPromises.set(messageId, {
                   resolve: () => {
                       clearTimeout(timeout);
                       this.pendingPromises.delete(messageId);
                       resolve();
                   },
                   reject: (error) => {
                       clearTimeout(timeout);
                       this.pendingPromises.delete(messageId);
                       reject(error);
                   }
               });

               this.connect().catch((error) => {
                   const { reject } = this.pendingPromises.get(messageId) || {};
                   if (reject) reject(error);
               });
           });
       }
   }

   restoreEventHandlers() {
       if (this.socket) {
           this.eventHandlers.forEach((handler, event) => {
               const listener = (message) => {
                   try {
                       const data = JSON.parse(message.data);
                       if (data.event === event) {
                           handler(data);
                       }
                   } catch (error) {
                       console.error('Error en handler:', error);
                   }
               };
               this.socket.addEventListener('message', listener);
           });
       }
   }

   disconnect() {
       if (this.reconnectTimeout) {
           clearTimeout(this.reconnectTimeout);
           this.reconnectTimeout = null;
       }
       
       // Rechazar todas las promesas pendientes
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