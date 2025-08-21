import { useState, useCallback, useEffect } from 'react';
import { useSpotify } from '../../hooks/useSpotify';
import { gameSocket } from '../../services/socketService';
import { ARTISTS } from './constants';

// Un estado inicial más limpio para el juego, facilita el reseteo.
const getInitialGameState = () => ({
  currentCard: null,
  selectedCategory: null,
  gameStep: 'init',
  connectedPlayers: [],
  isMarkingEnabled: false,
  allPlayersReady: false,
  songPlaying: false,
  playerPredictions: {},
  playerCorrectStatus: {}, // Renombrado de 'playerCorrect' para más claridad
  gameOver: false,
  winners: [],
});

export const useGameMasterLogic = ({ roomCode, initialDifficulty }) => {
  const { spotify, loggedIn, login, logout, token } = useSpotify();
  
  // -- ESTADOS --
  // Estado principal del juego, gestionado en su mayoría por el servidor.
  const [gameState, setGameState] = useState(getInitialGameState());
  // Estados que son puramente locales del cliente (Host)
  const [isLoading, setIsLoading] = useState(false);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [connectionError, setConnectionError] = useState(null);
  const [isTokenValid, setIsTokenValid] = useState(true);

  // -- EFECTO PRINCIPAL: GESTIÓN DE SOCKET Y AUTENTICACIÓN --
  useEffect(() => {
    // Si no estamos listos (sin login, token o código de sala), no hacemos nada.
    if (!loggedIn || !isTokenValid || !roomCode) {
        if (!token) {
            setGameState(prev => ({...prev, gameStep: 'init'}));
        }
        return;
    }

    // Función que se conecta, se une a la sala y configura los listeners.
    const initializeSocketConnection = async () => {
      try {
        await gameSocket.connect();
        // El host se une a la sala y el servidor debería devolver el estado completo.
        const roomInfo = await gameSocket.joinRoom(roomCode, { isHost: true, name: 'Game Master' }); 
        console.log('✅ Sala unida/creada. Estado inicial recibido:', roomInfo);
        
        // Actualizamos el estado del cliente con la información fidedigna del servidor.
        setGameState(prevState => ({
            ...prevState,
            connectedPlayers: roomInfo.players || [],
            difficulty: roomInfo.difficulty,
            gameStep: roomInfo.gameStep || 'wheel',
            // ...y cualquier otro estado que el servidor gestione (isMarkingEnabled, etc.)
        }));
        
        // Comprobar si los jugadores están listos al unirse.
        if (roomInfo.players) {
            const allReady = roomInfo.players.every(p => p.ready || p.isHost);
            setGameState(prev => ({...prev, allPlayersReady: allReady}));
        }

      } catch (error) {
        console.error('🔥 Error al inicializar la conexión:', error);
        setConnectionError(error.message);
      }
    };
    
    initializeSocketConnection();

    // -- LISTENERS DE BROADCAST DEL SERVIDOR --
    // Estos eventos son la "única fuente de verdad" y actualizan la UI.

    const handleGameStateUpdate = (newGameState) => {
        console.log('🔄 Actualización de estado recibida del servidor:', newGameState);
        // Actualizamos nuestro estado local con la información del servidor.
        setGameState(prevState => ({ ...prevState, ...newGameState }));
    };
    
    const handlePlayerPrediction = ({ playerName, prediction }) => {
        console.log(`[PREDICTION] ${playerName}: ${prediction}`);
        setGameState(prev => ({
            ...prev,
            playerPredictions: {
                ...prev.playerPredictions,
                [playerName]: [...(prev.playerPredictions[playerName] || []), prediction]
            }
        }));
    };
    
    const handleError = (error) => {
      console.error('🚨 Error de juego recibido del servidor:', error);
      setConnectionError(error.message || 'Error desconocido del servidor');
    };

    // Registramos los listeners.
    gameSocket.on('gameStateUpdate', handleGameStateUpdate);
    gameSocket.on('playerPrediction', handlePlayerPrediction);
    gameSocket.on('error', handleError);

    // Función de limpieza que se ejecuta al desmontar el componente.
    return () => {
      console.log('🧹 Limpiando listeners del hook useGameMasterLogic...');
      gameSocket.off('gameStateUpdate');
      gameSocket.off('playerPrediction');
      gameSocket.off('error');
      // Opcional: Desconectar si el Game Master abandona la vista para liberar recursos.
      // gameSocket.disconnect(); 
    };
  }, [loggedIn, isTokenValid, roomCode]); // Dependencias clave para la conexión inicial.
  
  // -- ACCIONES DEL HOST (EMISORES DE EVENTOS) --
  // Estas funciones ahora son más simples. Solo se encargan de enviar la petición al servidor.
  
  const handlePlayerCorrectToggle = useCallback(async (playerId) => {
    // La lógica de qué pasa después (deshabilitar marcado, etc.) reside en el servidor.
    try {
      console.log(`[ACTION] Enviando 'markPlayerCorrect' para el jugador ${playerId}`);
      await gameSocket.markPlayerCorrect({ roomCode, playerId });
      // NO actualizamos el estado local aquí. Esperamos el 'gameStateUpdate' del servidor.
    } catch (error) {
      console.error('Error al marcar jugador:', error);
      setConnectionError('Error al marcar el acierto del jugador');
    }
  }, [roomCode]);

  const handleDifficultyChange = useCallback(async (newDifficulty) => {
    try {
      setDifficulty(newDifficulty); // Actualización optimista para la UI del host.
      await gameSocket.updateRoom({ roomCode, difficulty: newDifficulty });
    } catch (error) {
      console.error('Error al cambiar dificultad:', error);
      setConnectionError(error.message);
      setDifficulty(difficulty); // Revertir en caso de error.
    }
  }, [roomCode, difficulty]);

  const handleCategorySelected = useCallback(async (category) => {
    try {
      // El servidor recibirá esto y enviará un 'gameStateUpdate' a todos
      // para cambiar a la fase de 'card', resetear estados, etc.
      await gameSocket.selectCategory({ roomCode, category });
    } catch (error) {
      console.error('Error al seleccionar categoría:', error);
      setConnectionError(error.message);
    }
  }, [roomCode]);

  const generateNewCard = useCallback(async () => {
    if (!gameState.selectedCategory || !spotify) {
        console.warn("No se puede generar la tarjeta: no hay categoría seleccionada o no hay sesión de Spotify.");
        return;
    }
    setIsLoading(true);
    try {
      const randomMusicCategory = Object.keys(ARTISTS)[Math.floor(Math.random() * Object.keys(ARTISTS).length)];
      const artistsInCategory = ARTISTS[randomMusicCategory];
      const randomArtist = artistsInCategory[Math.floor(Math.random() * artistsInCategory.length)];
      const response = await spotify.searchTracks(`artist:"${randomArtist}"`, { limit: 50, market: 'ES' });
      const randomTrack = response.tracks.items[0];

      if (!randomTrack) throw new Error('No se encontraron canciones para el artista seleccionado.');
      
      await spotify.playTrack(randomTrack.uri);

      // Enviamos la información completa de la canción al servidor.
      // El servidor crea la `card` y la distribuye a todos vía `gameStateUpdate`.
      await gameSocket.startSong({ 
          roomCode, 
          track: {
              uri: randomTrack.uri,
              title: randomTrack.name,
              artist: randomTrack.artists[0].name,
              year: parseInt(randomTrack.album.release_date.split('-')[0]),
          }
      });
    } catch (error) {
      console.error("Error generando tarjeta:", error);
      if (error?.status === 401 || error?.body?.error?.status === 401) {
        setIsTokenValid(false);
        logout();
      } else {
        setConnectionError('Error al generar la tarjeta');
      }
    } finally {
      setIsLoading(false);
    }
  }, [gameState.selectedCategory, spotify, roomCode, logout]);

  const handleRevealSong = useCallback(async () => {
    try {
      // El cliente no necesita saber los detalles de la canción, solo pide revelarla.
      await gameSocket.revealSong({ roomCode });
    } catch (error) {
      console.error('Error al revelar canción:', error);
      setConnectionError('Error al revelar la canción');
    }
  }, [roomCode]);
  
  const handleMarkingToggle = useCallback(async () => {
    try {
      // La lógica de si habilitar o deshabilitar está en el servidor.
      if (gameState.isMarkingEnabled) {
          await gameSocket.disableMarking({ roomCode });
      } else {
          await gameSocket.enableMarking({ roomCode });
      }
    } catch(error) {
        console.error('Error al cambiar estado de marcado:', error);
        setConnectionError('Error al cambiar estado de marcado');
    }
  }, [roomCode, gameState.isMarkingEnabled]);

  const finishGame = useCallback(async () => {
      try {
          await gameSocket.gameOver({ roomCode });
      } catch (error) {
          console.error('Error al finalizar el juego:', error);
          setConnectionError('Error al finalizar el juego');
      }
  }, [roomCode]);

  const startNewRound = useCallback(async () => {
    try {
        await gameSocket.restartGame({ roomCode });
    } catch(error) {
         console.error('Error al iniciar nueva ronda:', error);
         setConnectionError('Error al iniciar nueva ronda');
    }
  }, [roomCode]);

  return {
    // Exportamos el estado desestructurado para facilidad de uso en la UI.
    ...gameState, 
    // Y el resto de propiedades y manejadores que el componente necesita.
    difficulty,
    isLoading,
    connectionError,
    isTokenValid,
    loggedIn,
    login,
    logout,
    setConnectionError,
    handlePlayerCorrectToggle,
    handleDifficultyChange,
    handleCategorySelected,
    generateNewCard,
    handleRevealSong,
    handleMarkingToggle,
    startNewRound,
    finishGame
  };
};