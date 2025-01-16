import { useState, useCallback, useEffect } from 'react';
import { gameSocket } from '../../services/socketService';
import {
  BOARD_SIZE,
  MAX_PER_CATEGORY,
  MIN_DIFFERENT_CATEGORIES,
  CATEGORIES_A,
  CATEGORIES_B
} from '../constants';

export const useMusicBingoLogic = ({ playerName, roomCode, difficulty }) => {
  // Estados del juego
  const [board, setBoard] = useState([]);
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [canMark, setCanMark] = useState(false);
  const [hasWinner, setHasWinner] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [gamePhase, setGamePhase] = useState('waiting');

  // Validación de línea mejorada
  const validateLine = useCallback((line) => {
    if (!line || line.length !== BOARD_SIZE) return false;

    const categoryCounts = {};
    let markedCount = 0;

    line.forEach(cell => {
      if (cell?.marked) {
        categoryCounts[cell.name] = (categoryCounts[cell.name] || 0) + 1;
        markedCount++;
      }
    });

    if (markedCount !== BOARD_SIZE) return false;

    const hasMoreThanTwoRepeats = Object.values(categoryCounts)
      .some(count => count > MAX_PER_CATEGORY);
    const differentCategories = Object.keys(categoryCounts).length;

    return !hasMoreThanTwoRepeats && differentCategories >= MIN_DIFFERENT_CATEGORIES;
  }, []);

  // Verificación de victoria mejorada
  const checkWinner = useCallback((newBoard) => {
    if (!newBoard || newBoard.length !== BOARD_SIZE * BOARD_SIZE) return false;

    // Verificar filas
    for (let i = 0; i < BOARD_SIZE; i++) {
      const row = newBoard.slice(i * BOARD_SIZE, (i + 1) * BOARD_SIZE);
      if (validateLine(row)) return true;
    }

    // Verificar columnas
    for (let i = 0; i < BOARD_SIZE; i++) {
      const column = Array(BOARD_SIZE).fill(0).map((_, j) => newBoard[j * BOARD_SIZE + i]);
      if (validateLine(column)) return true;
    }

    // Verificar diagonales
    const diagonal1 = Array(BOARD_SIZE).fill(0).map((_, i) => newBoard[i * BOARD_SIZE + i]);
    const diagonal2 = Array(BOARD_SIZE).fill(0)
      .map((_, i) => newBoard[i * BOARD_SIZE + (BOARD_SIZE - 1 - i)]);

    return validateLine(diagonal1) || validateLine(diagonal2);
  }, [validateLine]);

  // Generación de tablero mejorada
  const generateValidBoard = useCallback(() => {
    const categories = difficulty === 'experto' ? CATEGORIES_B : CATEGORIES_A;
    let attempts = 0;
    const MAX_ATTEMPTS = 1000;

    const validateBoard = (board) => {
      const categoryCounts = {};
      board.forEach(cell => {
        categoryCounts[cell.name] = (categoryCounts[cell.name] || 0) + 1;
      });
      return Object.values(categoryCounts).every(count => count >= 2);
    };

    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      const newBoard = Array(BOARD_SIZE * BOARD_SIZE).fill(null).map(() => ({
        ...categories[Math.floor(Math.random() * categories.length)],
        marked: false
      }));

      if (validateBoard(newBoard)) {
        return newBoard;
      }
    }

    console.warn('No se pudo generar un tablero óptimo después de', MAX_ATTEMPTS, 'intentos');
    return Array(BOARD_SIZE * BOARD_SIZE).fill(null).map(() => ({
      ...categories[Math.floor(Math.random() * categories.length)],
      marked: false
    }));
  }, [difficulty]);

  // Unirse al juego mejorado
  const joinGame = useCallback(async () => {
    try {
      console.log('Intentando conectar al juego:', { roomCode, playerName });

      // Asegurarse de que no hay conexión previa
      await gameSocket.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));

      await gameSocket.connect();

      const joinResponse = await gameSocket.joinRoom(roomCode, {
        name: playerName,
        difficulty,
        isHost: false
      });

      console.log('Respuesta de unión:', joinResponse);

      if (!joinResponse) {
        throw new Error('No se recibió respuesta del servidor');
      }

      if (joinResponse.players) {
        setConnectedPlayers(joinResponse.players);
      }

      if (joinResponse.phase) {
        setGamePhase(joinResponse.phase);
      }

      if (joinResponse.currentCategory) {
        setCurrentCategory(joinResponse.currentCategory);
        if (joinResponse.phase === 'playing') {
          setBoard(generateValidBoard());
        }
      }

    } catch (error) {
      console.error('Error uniéndose al juego:', error);
      setConnectionError(error.message || 'Error al unirse al juego');
      setGamePhase('waiting');
    }
  }, [roomCode, playerName, difficulty, generateValidBoard]);

  // Manejo de click mejorado
  const handleCellClick = useCallback((index, isUnmarking = false) => {
    if (!canMark && !isUnmarking) {
      console.log('No se puede marcar en este momento');
      return;
    }

    setBoard(prev => {
      if (!prev || !prev[index]) return prev;

      const newBoard = [...prev];
      const cell = newBoard[index];

      if (currentCategory && cell.name === currentCategory.name) {
        newBoard[index] = { ...cell, marked: !cell.marked };

        // Verificar victoria después de marcar
        if (checkWinner(newBoard)) {
          setHasWinner(true);
          gameSocket.winner({ roomCode, playerName })
            .catch(error => console.error('Error al reportar victoria:', error));
        }

        return newBoard;
      }
      return prev;
    });
  }, [canMark, currentCategory, checkWinner, roomCode, playerName]);

  // Efecto para eventos del socket mejorado
  useEffect(() => {
    const handlers = {
      playersUpdate: ({ players }) => {
        console.log('Actualización de jugadores:', players);
        setConnectedPlayers(players);
      },
      categorySelected: ({ category }) => {
        console.log('Categoría seleccionada:', category);
        setCurrentCategory(category);
        setCurrentSong(null);
        setCanMark(false);
        setGamePhase('playing');
      },
      songRevealed: (songData) => {
        console.log('Canción revelada:', songData);
        setCurrentSong(songData);
      },
      markingEnabled: () => {
        console.log('Marcado habilitado');
        setCanMark(true);
      },
      markingDisabled: () => {
        console.log('Marcado deshabilitado');
        setCanMark(false);
      },
      gameStarted: () => {
        console.log('Juego iniciado');
        setGamePhase('playing');
        setBoard(generateValidBoard());
      },
      gameStartFailed: () => {
        console.log('Inicio de juego fallido');
        setGamePhase('waiting');
      },
      roomNotFound: () => {
        console.error('Sala no encontrada');
        setConnectionError('Sala no encontrada o inaccesible');
        setGamePhase('waiting');
      },
      error: (error) => {
        console.error('Error en socket:', error);
        setConnectionError(error.message || 'Error de conexión');
      },
      disconnect: () => {
        console.log('Desconectado del servidor');
        setGamePhase('waiting');
        setConnectionError('Se perdió la conexión con el servidor');
      }
    };

    // Registrar handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      gameSocket.on(event, handler);
    });

    // Iniciar conexión
    if (roomCode && playerName) {
      joinGame().catch(error => {
        console.error('Error en la conexión inicial:', error);
        setConnectionError(error.message || 'Error al conectar');
      });
    }

    // Limpieza mejorada
    return () => {
      console.log('Limpiando listeners y conexión');
      Object.keys(handlers).forEach(event => {
        gameSocket.off(event);
      });
      gameSocket.disconnect();
    };
  }, [joinGame, generateValidBoard, roomCode, playerName]);

  // Efecto para generar tablero cuando sea necesario
  useEffect(() => {
    if (gamePhase === 'playing' && board.length === 0) {
      console.log('Generando tablero inicial');
      setBoard(generateValidBoard());
    }
  }, [gamePhase, generateValidBoard, board.length]);

  return {
    board,
    connectedPlayers,
    currentCategory,
    currentSong,
    canMark,
    hasWinner,
    connectionError,
    setConnectionError,
    gamePhase,
    handleCellClick
  };
};