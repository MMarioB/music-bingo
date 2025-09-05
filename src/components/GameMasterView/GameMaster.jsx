import { useState, useCallback, useEffect } from 'react';
import { useSpotify } from '../../hooks/useSpotify';
import { gameSocket } from '../../services/socketService';
import { ARTISTS } from './constants';

const getInitialGameState = () => ({
  currentCard: null,
  currentCategory: null, // Cambiado de selectedCategory
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
        
        // Usar emit con callback en lugar de método directo
        gameSocket.emit('joinRoom', { 
          roomCode, 
          name: 'Game Master', 
          isHost: true 
        }, (response) => {
          if (response.success) {
            console.log('✅ Sala unida/creada como Host. Estado inicial:', response.data);
            setGameState(prevState => ({
                ...prevState,
                connectedPlayers: response.data.players || [],
                difficulty: response.data.difficulty || initialDifficulty,
                gameStep: response.data.gameStep || 'waiting',
            }));
          } else {
            console.error('Error al unirse a la sala:', response.error);
            setConnectionError(response.error);
          }
        });
        
      } catch (error) {
        console.error('🔥 Error al inicializar conexión del Host:', error);
        setConnectionError(error.message);
      }
    };
    
    initializeSocketConnection();

    const handleGameStateUpdate = (newGameState) => {
        console.log('GameMaster recibió gameStateUpdate:', newGameState);
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
      gameSocket.off('gameStateUpdate', handleGameStateUpdate);
      gameSocket.off('playerPrediction', handlePlayerPrediction);
      gameSocket.off('error', handleError);
    };
  }, [loggedIn, isTokenValid, roomCode, initialDifficulty]);
  
  const handlePlayerCorrectToggle = useCallback(async (playerId) => {
    try {
      gameSocket.emit('markPlayerCorrect', { roomCode, playerId }, (response) => {
        if (!response.success) {
          console.error('Error al marcar jugador:', response.error);
          setConnectionError('Error al marcar el acierto del jugador');
        }
      });
    } catch (error) {
      console.error('Error al marcar jugador:', error);
      setConnectionError('Error al marcar el acierto del jugador');
    }
  }, [roomCode]);

  const handleDifficultyChange = useCallback(async (newDifficulty) => {
    try {
      setDifficulty(newDifficulty);
      // Este método probablemente no existe en el servidor, lo comentamos por ahora
      // await gameSocket.updateRoom({ roomCode, difficulty: newDifficulty });
    } catch (error) {
      console.error('Error al cambiar dificultad:', error);
      setConnectionError(error.message);
      setDifficulty(difficulty);
    }
  }, [roomCode, difficulty]);

  const handleCategorySelected = useCallback(async (category) => {
    try {
      gameSocket.emit('selectCategory', { roomCode, category }, (response) => {
        if (!response.success) {
          console.error('Error al seleccionar categoría:', response.error);
          setConnectionError(response.error);
        }
      });
    } catch (error) {
      console.error('Error al seleccionar categoría:', error);
      setConnectionError(error.message);
    }
  }, [roomCode]);

  const generateNewCard = useCallback(async () => {
    // CORREGIDO: usar currentCategory en lugar de selectedCategory
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
      
      gameSocket.emit('startSong', { 
          roomCode, 
          track: {
              uri: randomTrack.uri,
              title: randomTrack.name,
              artist: randomTrack.artists[0].name,
              year: parseInt(randomTrack.album.release_date.split('-')[0]),
              musicCategory: randomMusicCategory,
              spotifyUrl: randomTrack.external_urls.spotify
          }
      }, (response) => {
        if (!response.success) {
          console.error('Error al iniciar canción:', response.error);
          setConnectionError(response.error);
        }
      });
      
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
  }, [gameState.currentCategory, spotify, roomCode, logout]); // Cambiado selectedCategory por currentCategory

  const handleRevealSong = useCallback(async () => {
    try {
      gameSocket.emit('revealSong', { roomCode }, (response) => {
        if (!response.success) {
          console.error('Error al revelar canción:', response.error);
          setConnectionError('Error al revelar la canción');
        }
      });
    } catch (error) {
      console.error('Error al revelar canción:', error);
      setConnectionError('Error al revelar la canción');
    }
  }, [roomCode]);
  
  const handleMarkingToggle = useCallback(async () => {
    try {
      if (gameState.isMarkingEnabled) {
          gameSocket.emit('disableMarking', { roomCode }, (response) => {
            if (!response.success) {
              console.error('Error al deshabilitar marcado:', response.error);
              setConnectionError('Error al cambiar estado de marcado');
            }
          });
      } else {
          gameSocket.emit('enableMarking', { roomCode }, (response) => {
            if (!response.success) {
              console.error('Error al habilitar marcado:', response.error);
              setConnectionError('Error al cambiar estado de marcado');
            }
          });
      }
    } catch(error) {
        console.error('Error al cambiar estado de marcado:', error);
        setConnectionError('Error al cambiar estado de marcado');
    }
  }, [roomCode, gameState.isMarkingEnabled]);

  const finishGame = useCallback(async () => {
      try {
          gameSocket.emit('gameOver', { roomCode }, (response) => {
            if (!response.success) {
              console.error('Error al finalizar el juego:', response.error);
              setConnectionError('Error al finalizar el juego');
            }
          });
      } catch (error) {
          console.error('Error al finalizar el juego:', error);
          setConnectionError('Error al finalizar el juego');
      }
  }, [roomCode]);

  const startNewRound = useCallback(async () => {
    try {
        gameSocket.emit('restartGame', { roomCode }, (response) => {
          if (!response.success) {
            console.error('Error al iniciar nueva ronda:', response.error);
            setConnectionError('Error al iniciar nueva ronda');
          }
        });
    } catch(error) {
         console.error('Error al iniciar nueva ronda:', error);
         setConnectionError('Error al iniciar nueva ronda');
    }
  }, [roomCode]);

  // CORREGIDO: Retornar currentCategory como selectedCategory para compatibilidad con la vista
  return {
    ...gameState, 
    selectedCategory: gameState.currentCategory, // Para compatibilidad con la vista
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