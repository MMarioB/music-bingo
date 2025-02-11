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

               // Timeout para la conexión inicial
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

               this.socket.onclose = (event) => {
                   console.log('WebSocket desconectado:', event.code);
                   clearTimeout(connectionTimeout);
                   this.connected = false;
                   this.isConnecting = false;

                   // Rechazar todas las promesas pendientes
                   this.pendingPromises.forEach(({ reject: promiseReject }) => {
                       promiseReject(new Error('Conexión cerrada'));
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

                       // Manejar respuesta con messageId
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

                       // Manejar errores globales
                       if (data.error) {
                           const handler = this.eventHandlers.get('error');
                           if (handler) handler(data.error);
                           return;
                       }

                       // Manejar eventos normales
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
               reject(new Error('Timeout en envío de mensaje'));
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
                   data: { ...data, messageId }
               }));
           } catch (error) {
               clearTimeout(timeout);
               this.pendingPromises.delete(messageId);
               reject(error);
           }
       });
   }

   async createRoom(roomConfig) {
       console.log('Creando sala:', roomConfig);
       return this.sendWithResponse('createRoom', roomConfig);
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

   async sendWithResponse(event, data) {
       try {
           const response = await this.send(event, data);
           if (response.error) {
               throw new Error(response.error.message || 'Error desconocido');
           }
           return response;
       } catch (error) {
           throw new Error(`Error en ${event}: ${error.message}`);
       }
   }

   async reconnect() {
       if (this.isConnecting) return;
       this.connectionAttempts++;
       console.log(`Intento de reconexión ${this.connectionAttempts}/${this.maxAttempts}`);
       try {
           await this.connect();
       } catch (error) {
           console.error('Error en reconexión:', error);
       }
   }

   disconnect() {
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