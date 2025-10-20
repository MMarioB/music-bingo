import { useState, useCallback, useEffect } from 'react';
import { useSpotify } from '../../hooks/useSpotify';
import { gameSocket } from '../../services/socketService';
import { ARTISTS } from './constants';

const getInitialGameState = () => ({
  currentCard: null,
  currentCategory: null,
  gameStep: 'init',
  connectedPlayers: [],
  isMarkingEnabled: false,
  allPlayersReady: false,
  songPlaying: false,
  playerPredictions: {},
  playerCorrectStatus: {},
  gameOver: false,
  winners: [],
});

export const useGameMasterLogic = ({ roomCode, initialDifficulty }) => {
  const { spotify, loggedIn, login, logout, token } = useSpotify();

  const [gameState, setGameState] = useState(getInitialGameState());
  const [isLoading, setIsLoading] = useState(false);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [connectionError, setConnectionError] = useState(null);
  const [isTokenValid, setIsTokenValid] = useState(true);

  useEffect(() => {
    if (!loggedIn || !isTokenValid || !roomCode) {
      if (!token) setGameState(prev => ({ ...prev, gameStep: 'init' }));
      return;
    }

    const initializeSocketConnection = async () => {
      try {
        await gameSocket.connect();

        const response = await gameSocket.joinRoom(roomCode, {
          name: 'Game Master',
          isHost: true,
          reconnecting: true
        });

        if (response && response.success) {
          console.log('✅ Sala unida/creada como Host. Estado inicial:', response.data);
          setGameState(prevState => ({
            ...prevState,
            connectedPlayers: response.data.players || [],
            difficulty: response.data.difficulty || initialDifficulty,
            gameStep: response.data.gameStep || 'waiting',
          }));
        } else if (response && response.success === false) {
          console.error('Error al unirse a la sala:', response.error);
          setConnectionError(response.error);
        } else {
          console.log('✅ Conexión establecida, esperando actualización de estado...');
          setGameState(prevState => ({
            ...prevState,
            gameStep: 'waiting',
          }));
        }

      } catch (error) {
        console.error('🔥 Error al inicializar conexión del Host:', error);
        setConnectionError(error.message);
      }
    };

    initializeSocketConnection();

    const handleGameStateUpdate = (newGameState) => {
      console.log('🎮 GameMaster recibió gameStateUpdate:', newGameState);

      // CRÍTICO: Actualizar TODO el estado que viene del servidor
      setGameState(prevState => ({
        ...prevState,
        ...newGameState,
        // Asegurar que estos campos críticos se actualicen
        isMarkingEnabled: newGameState.isMarkingEnabled !== undefined
          ? newGameState.isMarkingEnabled
          : prevState.isMarkingEnabled,
        playerCorrectStatus: newGameState.playerCorrectStatus || prevState.playerCorrectStatus,
      }));
    };

    const handlePlayerPrediction = ({ playerName, prediction }) => {
      console.log(`[PREDICTION RECEIVED] ${playerName}: ${prediction}`);
      setGameState(prev => ({
        ...prev,
        playerPredictions: {
          ...prev.playerPredictions,
          [playerName]: [...(prev.playerPredictions[playerName] || []), prediction]
        }
      }));
    };

    const handleError = (error) => {
      setConnectionError(error.message || 'Error desconocido');
    };

    gameSocket.on('gameStateUpdate', handleGameStateUpdate);
    gameSocket.on('playerPrediction', handlePlayerPrediction);
    gameSocket.on('error', handleError);

    return () => {
      gameSocket.off('gameStateUpdate', handleGameStateUpdate);
      gameSocket.off('playerPrediction', handlePlayerPrediction);
      gameSocket.off('error', handleError);
    };
  }, [loggedIn, isTokenValid, roomCode, initialDifficulty, token]);

  const handlePlayerCorrectToggle = useCallback(async (playerId) => {
    try {
      console.log('🎯 Marcando jugador como correcto:', playerId);

      // Actualización optimista del estado local
      setGameState(prev => ({
        ...prev,
        playerCorrectStatus: {
          ...prev.playerCorrectStatus,
          [playerId]: !prev.playerCorrectStatus[playerId]
        }
      }));

      await gameSocket.markPlayerCorrect({ roomCode, playerId });

    } catch (error) {
      console.error('Error al marcar jugador:', error);
      setConnectionError('Error al marcar el acierto del jugador');

      // Revertir el cambio optimista si hay error
      setGameState(prev => ({
        ...prev,
        playerCorrectStatus: {
          ...prev.playerCorrectStatus,
          [playerId]: !prev.playerCorrectStatus[playerId]
        }
      }));
    }
  }, [roomCode]);

  const handleDifficultyChange = useCallback(async (newDifficulty) => {
    try {
      setDifficulty(newDifficulty);
      await gameSocket.updateRoom({ roomCode, difficulty: newDifficulty });
    } catch (error) {
      console.error('Error al cambiar dificultad:', error);
      setConnectionError(error.message);
      setDifficulty(difficulty);
    }
  }, [roomCode, difficulty]);

  const handleCategorySelected = useCallback(async (category) => {
    try {
      const response = await gameSocket.selectCategory({ roomCode, category });
      if (response && response.success === false) {
        console.error('Error al seleccionar categoría:', response.error);
        setConnectionError(response.error);
      }
    } catch (error) {
      console.error('Error al seleccionar categoría:', error);
      setConnectionError(error.message);
    }
  }, [roomCode]);

  const generateNewCard = useCallback(async () => {
    if (!gameState.currentCategory || !spotify) {
      console.log('No hay categoría seleccionada o Spotify no está disponible');
      setConnectionError('Debe seleccionar una categoría primero');
      return;
    }

    setIsLoading(true);
    setConnectionError(null);

    try {
      const randomMusicCategory = Object.keys(ARTISTS)[Math.floor(Math.random() * Object.keys(ARTISTS).length)];
      const artistsInCategory = ARTISTS[randomMusicCategory];
      const randomArtist = artistsInCategory[Math.floor(Math.random() * artistsInCategory.length)];
      const response = await spotify.searchTracks(`artist:"${randomArtist}"`, { limit: 50, market: 'ES' });

      if (!response.tracks.items.length) {
        throw new Error('No se encontraron canciones para este artista.');
      }

      const randomTrack = response.tracks.items[Math.floor(Math.random() * response.tracks.items.length)];

      if (!randomTrack) {
        throw new Error('No se encontraron canciones.');
      }

      try {
        await spotify.playTrack(randomTrack.uri);
        console.log('✅ Canción enviada a Spotify para reproducción.');
      } catch (e) {
        console.error('🔥 Error de Spotify API:', e);
        setConnectionError('Error de Spotify: No se encontró un dispositivo activo. Asegúrate de tener Spotify abierto.');
        setIsLoading(false);
        return;
      }

      const response2 = await gameSocket.startSong({
        roomCode,
        track: {
          uri: randomTrack.uri,
          title: randomTrack.name,
          artist: randomTrack.artists[0].name,
          year: parseInt(randomTrack.album.release_date.split('-')[0]),
          musicCategory: randomMusicCategory,
          spotifyUrl: randomTrack.external_urls.spotify
        }
      });

      if (response2 && response2.success === false) {
        console.error('Error al iniciar canción:', response2.error);
        setConnectionError(response2.error);
      }

    } catch (error) {
      console.error("Error generando tarjeta:", error);
      if (error?.status === 401 || error?.body?.error?.status === 401) {
        setIsTokenValid(false);
        logout();
      } else {
        setConnectionError(error.message || 'Error al generar la tarjeta');
      }
    } finally {
      setIsLoading(false);
    }
  }, [gameState.currentCategory, spotify, roomCode, logout]);

  const handleRevealSong = useCallback(async () => {
    try {
      await gameSocket.revealSong({ roomCode });
    } catch (error) {
      console.error('Error al revelar canción:', error);
      setConnectionError('Error al revelar la canción');
    }
  }, [roomCode]);

  const handleMarkingToggle = useCallback(async () => {
    const action = gameState.isMarkingEnabled ? 'disableMarking' : 'enableMarking';
    const newMarkingState = !gameState.isMarkingEnabled;

    console.log(`🚀 Cambiando estado de marcado a: ${newMarkingState}`);

    // Actualización optimista del estado local
    setGameState(prev => ({
      ...prev,
      isMarkingEnabled: newMarkingState
    }));

    try {
      const response = await gameSocket[action]({ roomCode });
      console.log(`✅ Acción '${action}' confirmada:`, response);

      // Verificar que el servidor confirme el estado esperado
      if (response && response.data && response.data.isMarkingEnabled !== newMarkingState) {
        console.warn('⚠️ Estado de marcado no coincide, ajustando...');
        setGameState(prev => ({
          ...prev,
          isMarkingEnabled: response.data.isMarkingEnabled
        }));
      }

    } catch (error) {
      console.error(`🔥 Error en '${action}':`, error);
      setConnectionError(`Error al cambiar el estado de marcado: ${error.message}`);

      // Revertir el cambio optimista si hay error
      setGameState(prev => ({
        ...prev,
        isMarkingEnabled: !newMarkingState
      }));
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
    } catch (error) {
      console.error('Error al iniciar nueva ronda:', error);
      setConnectionError('Error al iniciar nueva ronda');
    }
  }, [roomCode]);

  return {
    ...gameState,
    selectedCategory: gameState.currentCategory,
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