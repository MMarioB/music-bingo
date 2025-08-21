import { useState, useCallback, useEffect } from 'react';
import { useSpotify } from '../../hooks/useSpotify';
import { gameSocket } from '../../services/socketService';
import { ARTISTS } from './constants';

const getInitialGameState = () => ({
  currentCard: null,
  selectedCategory: null,
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
      if (!token) setGameState(prev => ({...prev, gameStep: 'init'}));
      return;
    }

    const initializeSocketConnection = async () => {
      try {
        await gameSocket.connect();
        const roomInfo = await gameSocket.joinRoom(roomCode, { isHost: true, name: 'Game Master' }); 
        
        console.log('✅ Sala unida/creada como Host. Estado inicial:', roomInfo);
        
        setGameState(prevState => ({
            ...prevState,
            connectedPlayers: roomInfo.players || [],
            difficulty: roomInfo.difficulty,
            gameStep: roomInfo.gameStep || 'waiting',
        }));
        
      } catch (error) {
        console.error('🔥 Error al inicializar conexión del Host:', error);
        setConnectionError(error.message);
      }
    };
    
    initializeSocketConnection();

    const handleGameStateUpdate = (newGameState) => {
        setGameState(prevState => ({ ...prevState, ...newGameState }));
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
      gameSocket.off('gameStateUpdate');
      gameSocket.off('playerPrediction');
      gameSocket.off('error');
    };
  }, [loggedIn, isTokenValid, roomCode]);
  
  const handlePlayerCorrectToggle = useCallback(async (playerId) => {
    try {
      await gameSocket.markPlayerCorrect({ roomCode, playerId });
    } catch (error) {
      console.error('Error al marcar jugador:', error);
      setConnectionError('Error al marcar el acierto del jugador');
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
      await gameSocket.selectCategory({ roomCode, category });
    } catch (error) {
      console.error('Error al seleccionar categoría:', error);
      setConnectionError(error.message);
    }
  }, [roomCode]);

  const generateNewCard = useCallback(async () => {
    if (!gameState.selectedCategory || !spotify) return;
    setIsLoading(true);
    try {
      const randomMusicCategory = Object.keys(ARTISTS)[Math.floor(Math.random() * Object.keys(ARTISTS).length)];
      const artistsInCategory = ARTISTS[randomMusicCategory];
      const randomArtist = artistsInCategory[Math.floor(Math.random() * artistsInCategory.length)];
      const response = await spotify.searchTracks(`artist:"${randomArtist}"`, { limit: 50, market: 'ES' });
      const randomTrack = response.tracks.items[0];
      if (!randomTrack) throw new Error('No se encontraron canciones.');
      
      await spotify.playTrack(randomTrack.uri);
      
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
      await gameSocket.revealSong({ roomCode });
    } catch (error) {
      console.error('Error al revelar canción:', error);
      setConnectionError('Error al revelar la canción');
    }
  }, [roomCode]);
  
  const handleMarkingToggle = useCallback(async () => {
    try {
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
    ...gameState, 
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