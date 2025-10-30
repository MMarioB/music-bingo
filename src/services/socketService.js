import { io } from 'socket.io-client';

class GameWebSocket {
  constructor() {
    this.socket = null;
    this.eventHandlers = new Map();
    this.isConnecting = false;
    this.connectPromise = null;
    this.lastRoomData = null;
    this.reconnectionAttempts = 0; // NUEVO: Contador de intentos
    this.maxReconnectionAttempts = 3; // NUEVO: Máximo de intentos
    this.serverWaking = false; // NUEVO: Flag para servidor despertando
    this.connectionStartTime = null; // NUEVO: Para detectar tiempos largos
  }

  connect() {
    // Si ya está conectado, retornar inmediatamente
    if (this.socket && this.socket.connected) return Promise.resolve();

    // Si ya estamos conectando, esperar a esa promesa
    if (this.isConnecting) return this.connectPromise;

    // Si hay un socket existente pero desconectado, esperar a que se reconecte automáticamente
    if (this.socket && !this.socket.connected) {
      console.log('⏳ Socket existe pero está desconectado, esperando reconexión automática...');

      return new Promise((resolve) => {
        // Esperar al evento 'connect' del socket existente
        const onConnect = () => {
          console.log('✅ Reconexión automática exitosa');
          this.socket.off('connect', onConnect);
          resolve();
        };

        this.socket.once('connect', onConnect);

        // Si después de 5 segundos no se reconecta, forzar nueva conexión
        setTimeout(() => {
          if (!this.socket.connected) {
            console.log('⚠️ Reconexión automática falló, creando nueva conexión...');
            this.socket.off('connect', onConnect);
            this.socket.close();
            this.socket = null;
            this.connect().then(resolve);
          }
        }, 5000);
      });
    }

    this.isConnecting = true;
    this.connectionStartTime = Date.now(); // NUEVO: Registrar inicio de conexión

    this.connectPromise = new Promise((resolve, reject) => {
      console.log('🔌 Intentando conectar al servidor...');

      // NUEVO: Detectar si tarda más de 3 segundos (servidor probablemente dormido)
      const wakingCheckTimer = setTimeout(() => {
        if (this.isConnecting && !this.serverWaking) {
          this.serverWaking = true;
          console.log('⏳ Servidor parece estar dormido, despertando...');
          this._notifyServerWaking();
        }
      }, 3000);

      this.socket = io(import.meta.env.VITE_WS_URL, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 30000, // MODIFICADO: Aumentar timeout a 30s para servidor dormido
        transports: ['websocket', 'polling'],
        forceNew: true,
      });

      this.socket.on('connect', async () => {
        clearTimeout(wakingCheckTimer); // NUEVO: Limpiar timer

        const connectionTime = Date.now() - this.connectionStartTime;
        console.log(`✅ Conectado exitosamente al servidor. ID: ${this.socket.id} (${connectionTime}ms)`);

        // NUEVO: Si estaba despertando, notificar que ya despertó
        if (this.serverWaking) {
          console.log('🎉 Servidor ha despertado exitosamente');
          this._notifyServerAwake();
          this.serverWaking = false;
        }

        this.isConnecting = false;
        this.reconnectionAttempts = 0; // NUEVO: Reset contador
        this.restoreEventHandlers();
        
        // MODIFICADO: Auto-rejoin si tenemos datos de sala guardados
        if (this.lastRoomData) {
          console.log('🔄 Auto-rejoin detectado, reestableciendo sala...');
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
        console.warn('❌ Desconectado del servidor:', reason);
        // NUEVO: Manejar diferentes tipos de desconexión
        if (reason === 'io server disconnect') {
          console.log('🚨 Servidor nos desconectó intencionalmente');
          this._handleServerDisconnect();
        }
      });

      // NUEVO: Eventos para reconexión de host
      this.socket.on('hostDisconnected', (data) => {
        console.log('⚠️ Host desconectado:', data.message);
        // Mostrar mensaje de espera a los jugadores
        this._showHostDisconnectedMessage(data.message);
      });

      this.socket.on('hostReconnected', (data) => {
        console.log('✅ Host reconectado:', data.message);
        // Ocultar mensaje de espera
        this._hideHostDisconnectedMessage();
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔥 Error de conexión:', error.message);
        this.isConnecting = false;
        reject(error);
      });
    });

    return this.connectPromise;
  }
  
  // MODIFICADO: Manejo robusto de rejoin con reintentos
  async _rejoinRoom() {
    if (!this.lastRoomData) return;
    
    this.reconnectionAttempts++;
    console.log(`🔄 Intento de rejoin ${this.reconnectionAttempts}/${this.maxReconnectionAttempts}:`, this.lastRoomData);
    
    try {
      const response = await this._emit(
        'joinRoom', 
        { ...this.lastRoomData, reconnecting: true }, 
        true,
        10000 // NUEVO: Timeout más corto para rejoin
      );
      
      if (response && response.error) {
        throw new Error(response.error);
      }
      
      console.log('✅ Rejoin exitoso');
      this.reconnectionAttempts = 0;
      return response;
      
    } catch (error) {
      console.error(`❌ Rejoin falló (intento ${this.reconnectionAttempts}):`, error.message);
      throw error;
    }
  }
  
  // NUEVO: Manejar fallos de rejoin con reintentos automáticos
  _handleRejoinFailure(error) {
    console.log(error);
    if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
      console.error('💀 Máximo de intentos de reconexión alcanzado');
      this.lastRoomData = null;
      this._showReconnectionFailedMessage();
      return;
    }
    
    // Reintentar después de un delay exponencial
    const delay = Math.min(2000 * Math.pow(2, this.reconnectionAttempts - 1), 10000);
    console.log(`⏱️ Reintentando rejoin en ${delay}ms...`);
    
    setTimeout(async () => {
      try {
        await this._rejoinRoom();
      } catch (retryError) {
        this._handleRejoinFailure(retryError);
      }
    }, delay);
  }

  // NUEVO: Manejar desconexión intencional del servidor
  _handleServerDisconnect() {
    this.lastRoomData = null;
    this._showServerDisconnectMessage();
  }

  // NUEVO: Métodos para UI (implementar según tu framework)
  _showHostDisconnectedMessage(message) {
    console.log('🔔 Mostrar mensaje:', message);
    // Implementar según tu UI - ejemplo:
    // const statusEl = document.getElementById('connection-status');
    // if (statusEl) statusEl.textContent = message;
    
    // O si usas React/Vue, emitir evento personalizado:
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hostDisconnected', { detail: { message } }));
    }
  }

  _hideHostDisconnectedMessage() {
    console.log('🔔 Ocultar mensaje de host desconectado');
    // Implementar según tu UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hostReconnected'));
    }
  }

  _showReconnectionFailedMessage() {
    console.log('🔔 Mostrar: La sesión ha expirado, redirigiendo...');
    // Implementar según tu UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('reconnectionFailed'));
      
      // Opcional: Redirigir automáticamente después de mostrar mensaje
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    }
  }

  _showServerDisconnectMessage() {
    console.log('🔔 Mostrar: Desconectado del servidor');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('serverDisconnect'));

      // Opcional: Redirigir automáticamente
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  }

  // NUEVO: Notificar que el servidor está despertando
  _notifyServerWaking() {
    console.log('🔔 Mostrar: Servidor despertando...');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('serverWaking', {
        detail: { message: '⏳ El servidor está despertando, esto puede tomar unos segundos...' }
      }));
    }
  }

  // NUEVO: Notificar que el servidor ha despertado
  _notifyServerAwake() {
    console.log('🔔 Servidor despierto');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('serverAwake'));
    }
  }
  
  // MÉTODO ÚNICO: callback para request-response, directo para fire-and-forget
  async _emit(eventName, data, expectResponse = false, timeoutMs = 15000) {
    try {
      await this.ensureConnection();
    } catch (error) {
      console.error(`❌ Error al asegurar conexión para ${eventName}:`, error);
      if (expectResponse) {
        throw error;
      } else {
        // Para fire-and-forget, solo logueamos el error y continuamos
        console.warn(`⚠️ No se pudo enviar ${eventName} (fire-and-forget), conexión no disponible`);
        return;
      }
    }

    console.log(`[EMIT${expectResponse ? '-CALLBACK' : ''}] ${eventName}`, data);

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

  // --- MÉTODOS QUE ESPERAN RESPUESTA (callback) ---
  createRoom(roomConfig) { 
    // NUEVO: Guardar datos para posible reconexión
    this.lastRoomData = {
      roomCode: roomConfig.roomCode,
      name: 'Game Master',
      isHost: true
    };
    
    return this._emit('createRoom', roomConfig, true); 
  }
  
  joinRoom(roomCode, playerInfo) { 
    // NUEVO: Guardar datos para posible reconexión
    this.lastRoomData = {
      roomCode,
      ...playerInfo
    };
    
    return this._emit('joinRoom', { roomCode, ...playerInfo }, true); 
  }
  
  selectCategory(data) { 
    return this._emit('selectCategory', data, true); 
  }
  
  startSong(data) { 
    return this._emit('startSong', data, true); 
  }
  
  declareWinner(data) {
    return this._emit('declareWinner', data, true);
  }

  markPlayerCorrect(data) {
    return this._emit('markPlayerCorrect', data, true);
  }

  // --- MÉTODOS FIRE-AND-FORGET (no esperan respuesta) ---
  
  // MODIFICADO: Cambiar a callback para detectar errores de "Sala no encontrada"
  async enableMarking(data) {
    try {
      const response = await this._emit('enableMarking', data, true, 10000);
      console.log('✅ EnableMarking exitoso:', response);
      return response;
    } catch (error) {
      console.error('❌ Error al habilitar marcado:', error.message);
      
      // Si es error de sala no encontrada y somos host, intentar reconectar
      if (error.message.includes('Sala no encontrada') && this.lastRoomData && this.lastRoomData.isHost) {
        console.log('🔄 Intentando reconectar por error de sala...');
        try {
          await this._rejoinRoom();
          // Reintentar la acción original
          return await this._emit('enableMarking', data, true, 5000);
        } catch (rejoinError) {
          console.error('❌ Fallo al reconectar:', rejoinError.message);
        }
      }
      
      throw error;
    }
  }
  
  // MODIFICADO: Cambiar a callback para detectar errores de "Sala no encontrada"
  async disableMarking(data) {
    try {
      const response = await this._emit('disableMarking', data, true, 10000);
      console.log('✅ DisableMarking exitoso:', response);
      return response;
    } catch (error) {
      console.error('❌ Error al deshabilitar marcado:', error.message);
      
      // Si es error de sala no encontrada y somos host, intentar reconectar
      if (error.message.includes('Sala no encontrada') && this.lastRoomData && this.lastRoomData.isHost) {
        console.log('🔄 Intentando reconectar por error de sala...');
        try {
          await this._rejoinRoom();
          // Reintentar la acción original
          return await this._emit('disableMarking', data, true, 5000);
        } catch (rejoinError) {
          console.error('❌ Fallo al reconectar:', rejoinError.message);
        }
      }
      
      throw error;
    }
  }

  // MANTENER: Métodos de debug temporales
  enableMarkingDebug(data) {
    console.log('🔧 DEBUG: Probando enableMarking con callback:', data);
    return this._emit('enableMarking', data, true);
  }
  
  disableMarkingDebug(data) {
    console.log('🔧 DEBUG: Probando disableMarking con callback:', data);
    return this._emit('disableMarking', data, true);
  }

  async submitPrediction(data) {
    await this._emit('submitPrediction', data, false);
  }
  
  async setPlayerReady(roomCode) {
    await this._emit('playerReady', { roomCode }, false);
  }
  
  async startGame(data) {
    await this._emit('startGame', data, false);
  }
  
  async revealSong(data) {
    await this._emit('revealSong', data, false);
  }
  
  async updateRoom(data) {
    await this._emit('updateRoom', data, false);
  }

  async winner(data) {
    await this._emit('winner', data, false);
  }

  async gameOver(data) {
    await this._emit('gameOver', data, false);
  }

  restartGame(data) {
    return this._emit('restartGame', data, true, 10000);
  }

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
  
  // NUEVO: Método para limpiar datos de sala manualmente
  clearRoomData() {
    this.lastRoomData = null;
    this.reconnectionAttempts = 0;
    console.log('🧹 Datos de sala limpiados');
  }

  // NUEVO: Método para verificar si tenemos datos de sala
  hasRoomData() {
    return !!this.lastRoomData;
  }

  // NUEVO: Método para obtener datos de sala (solo lectura)
  getRoomData() {
    return this.lastRoomData ? { ...this.lastRoomData } : null;
  }
  
  disconnect() {
    if (this.socket) {
      this.clearRoomData(); // MODIFICADO: Usar método centralizado
      this.socket.disconnect();
      this.socket = null;
      this.connectPromise = null;
      this.isConnecting = false;
    }
  }

  // NUEVO: Método para reconexión manual (útil para UI)
  async forceReconnect() {
    console.log('🔄 Forzando reconexión...');
    this.disconnect();
    return await this.connect();
  }

  // NUEVO: Obtener estado de conexión
  getConnectionState() {
    return {
      connected: this.socket ? this.socket.connected : false,
      connecting: this.isConnecting,
      serverWaking: this.serverWaking, // NUEVO: Indicar si servidor está despertando
      hasRoomData: this.hasRoomData(),
      reconnectionAttempts: this.reconnectionAttempts,
      socketId: this.socket ? this.socket.id : null
    };
  }
}

export const gameSocket = new GameWebSocket();