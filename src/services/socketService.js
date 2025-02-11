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
   }

   async connect() {
       if (this.socket?.connected) return;
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
           };

           this.socket.onclose = (event) => {
               console.log('WebSocket desconectado:', event.code);
               this.connected = false;
               this.isConnecting = false;

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
                   
                   if (data.error || data.message) {
                       const handler = this.eventHandlers.get('error');
                       if (handler) handler(data);
                       return;
                   }

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
       await this.ensureConnection();
       if (!this.socket || this.socket.readyState !== SockJS.OPEN) {
           throw new Error('Socket not ready');
       }
       this.socket.send(JSON.stringify({ event, data }));
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
       return this.sendWithResponse('playerReady', { roomCode }, 'playersUpdate', 'error');
   }

   async startGame(roomCode, difficulty) {
       console.log('Iniciando juego:', roomCode, difficulty);
       return this.sendWithResponse('startGame', { roomCode, difficulty }, 'gameStarted', 'error');
   }

   async selectCategory(data) {
       console.log('Seleccionando categoría:', data);
       return this.sendWithResponse('selectCategory', data, 'categorySelected', 'error');
   }

   async revealSong(data) {
       console.log('Revelando canción:', data);
       await this.send('revealSong', data);
   }

   async enableMarking(data) {
       console.log('Habilitando marcado:', data);
       await this.send('enableMarking', data);
   }

   async disableMarking(data) {
       console.log('Deshabilitando marcado:', data);
       await this.send('disableMarking', data);
   }

   async winner(data) {
       console.log('Anunciando ganador:', data);
       await this.send('winner', data);
   }

   async sendWithResponse(event, data, successEvent, errorEvent = 'error') {
       return new Promise((resolve, reject) => {
           const timeout = setTimeout(() => {
               this.off(successEvent);
               this.off(errorEvent);
               reject(new Error('Timeout'));
           }, 10000);

           const successHandler = (response) => {
               clearTimeout(timeout);
               this.off(successEvent);
               this.off(errorEvent);
               resolve(response);
           };

           const errorHandler = (error) => {
               clearTimeout(timeout);
               this.off(successEvent);
               this.off(errorEvent);
               reject(new Error(error.message || 'Error desconocido'));
           };

           this.on(successEvent, successHandler);
           this.on(errorEvent, errorHandler);

           this.ensureConnection()
               .then(() => this.send(event, data))
               .catch(errorHandler);
       });
   }

   async reconnect() {
       if (this.isConnecting) return;
       this.connectionAttempts++;
       console.log(`Intento de reconexión ${this.connectionAttempts}/${this.maxAttempts}`);
       await this.connect();
   }

   async ensureConnection() {
       if (!this.connected) {
           await new Promise((resolve) => {
               if (this.socket && this.socket.readyState === SockJS.OPEN) {
                   resolve();
                   return;
               }

               const checkConnection = () => {
                   if (this.socket && this.socket.readyState === SockJS.OPEN) {
                       resolve();
                   } else {
                       setTimeout(checkConnection, 100);
                   }
               };

               this.connect().then(checkConnection);
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