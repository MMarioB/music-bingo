import { useState, useCallback, useEffect } from 'react';
import { gameSocket } from '../../services/socketService';
import {
  BOARD_SIZE,
  MIN_DIFFERENT_CATEGORIES,
  CATEGORIES_A,
  CATEGORIES_B
} from '../constants';

export const useMusicBingoLogic = ({ playerName, roomCode, difficulty }) => {
  const [board, setBoard] = useState([]);
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [canMark, setCanMark] = useState(false);
  const [hasWinner, setHasWinner] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [gamePhase, setGamePhase] = useState('waiting');
  const [predictions, setPredictions] = useState([]);
  const [songStarted, setSongStarted] = useState(false);
  const [isEligibleToMark, setIsEligibleToMark] = useState(false);

  // Función para validar la distribución de categorías
  const validateLine = useCallback((line) => {
    const categoryCounts = {};
    let markedCount = 0;

    line.forEach(cell => {
      if (cell.marked) {
        categoryCounts[cell.name] = (categoryCounts[cell.name] || 0) + 1;
        markedCount++;
      }
    });

    if (markedCount !== BOARD_SIZE) return false;

    // Verificar que no haya más de 2 casillas de la misma categoría
    const hasMoreThanTwoOfSameCategory = Object.values(categoryCounts).some(count => count > 2);
    if (hasMoreThanTwoOfSameCategory) return false;

    const differentCategories = Object.keys(categoryCounts).length;
    return differentCategories >= MIN_DIFFERENT_CATEGORIES;
  }, []);

  // Función auxiliar para validar una línea durante la generación
  const validateGeneratedLine = useCallback((line) => {
    const categoryCounts = {};
    line.forEach(cell => {
      categoryCounts[cell.name] = (categoryCounts[cell.name] || 0) + 1;
    });
    return !Object.values(categoryCounts).some(count => count > 2);
  }, []);

  // Función auxiliar para validar todo el tablero durante la generación
  const validateGeneratedBoard = useCallback((board) => {
    // Verificar filas
    for (let i = 0; i < BOARD_SIZE; i++) {
      const row = board.slice(i * BOARD_SIZE, (i + 1) * BOARD_SIZE);
      if (!validateGeneratedLine(row)) return false;
    }

    // Verificar columnas
    for (let i = 0; i < BOARD_SIZE; i++) {
      const column = Array(BOARD_SIZE).fill(0).map((_, j) => board[j * BOARD_SIZE + i]);
      if (!validateGeneratedLine(column)) return false;
    }

    // Verificar diagonales
    const diagonal1 = Array(BOARD_SIZE).fill(0).map((_, i) => board[i * BOARD_SIZE + i]);
    const diagonal2 = Array(BOARD_SIZE).fill(0).map((_, i) => board[i * BOARD_SIZE + (BOARD_SIZE - 1 - i)]);

    return validateGeneratedLine(diagonal1) && validateGeneratedLine(diagonal2);
  }, [validateGeneratedLine]);

  // Función para verificar victoria
  const checkWinner = useCallback((newBoard) => {
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
    const diagonal2 = Array(BOARD_SIZE).fill(0).map((_, i) => newBoard[i * BOARD_SIZE + (BOARD_SIZE - 1 - i)]);

    return validateLine(diagonal1) || validateLine(diagonal2);
  }, [validateLine]);

  // Función para generar tablero balanceado
  const generateValidBoard = useCallback(() => {
    const categories = difficulty === 'experto' ? CATEGORIES_B : CATEGORIES_A;
    const MAX_ATTEMPTS = 100;
    let attempts = 0;
    let cells = [];

    while (attempts < MAX_ATTEMPTS) {
      attempts++;

      // Crear array con 5 instancias de cada categoría
      cells = [];
      categories.forEach(category => {
        for (let i = 0; i < 5; i++) {
          cells.push({ ...category, marked: false });
        }
      });

      // Mezclar el array usando Fisher-Yates shuffle
      for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
      }

      if (validateGeneratedBoard(cells)) {
        return cells;
      }
    }

    console.warn('No se pudo generar un tablero perfectamente balanceado después de', MAX_ATTEMPTS, 'intentos');
    return cells;
  }, [difficulty, validateGeneratedBoard]);

  // Función para unirse a la sala
  const joinGame = useCallback(async () => {
    try {
      console.log('Intentando conectar al juego:', { roomCode, playerName });
      await gameSocket.connect();

      const joinResponse = await gameSocket.joinRoom(roomCode, {
        name: playerName,
        difficulty
      });

      if (joinResponse?.players) {
        setConnectedPlayers(joinResponse.players);
      }

      // Generar tablero al unirse
      const newBoard = generateValidBoard();
      setBoard(newBoard);

      if (joinResponse?.phase) {
        setGamePhase(joinResponse.phase);
      }
      if (joinResponse?.currentCategory) {
        setCurrentCategory(joinResponse.currentCategory);
        setGamePhase('playing');
      }
    } catch (error) {
      console.error('Error uniéndose al juego:', error);
      setConnectionError(error.message);
    }
  }, [roomCode, playerName, difficulty, generateValidBoard]);

  // Manejo de click en casillas
  const handleCellClick = useCallback((index, isUnmarking = false) => {
    if (!canMark && !isUnmarking) return;
    if (!isEligibleToMark) return; // No permitir marcar si no es elegible

    setBoard(prev => {
      const newBoard = [...prev];
      const cell = newBoard[index];

      if (currentCategory && cell.name === currentCategory.name) {
        newBoard[index] = { ...cell, marked: !cell.marked };

        if (checkWinner(newBoard)) {
          setHasWinner(true);
          gameSocket.winner({ roomCode, playerName });
        }

        return newBoard;
      }
      return prev;
    });
  }, [canMark, isEligibleToMark, currentCategory, checkWinner, roomCode, playerName]);

  const handlePrediction = useCallback((prediction) => {
    setPredictions(prev => [...prev, prediction]);
    // Emitir la predicción al servidor
    gameSocket.submitPrediction({
      roomCode,
      prediction
    });
  }, [roomCode]);

  // Efecto para eventos del socket
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
        setIsEligibleToMark(false);
        setSongStarted(false);
        setPredictions([]);
        setGamePhase('playing');
        // Asegurarnos de tener un tablero al cambiar categoría
        if (board.length === 0) {
          setBoard(generateValidBoard());
        }
      },
      songStarted: () => {
        console.log('Canción iniciada');
        setSongStarted(true);
      },
      songRevealed: (songData) => {
        console.log('Canción revelada:', songData);
        setCurrentSong(songData);
        setSongStarted(false);
        setIsEligibleToMark(false);
      },
      markingEnabled: ({ eligiblePlayers }) => {
        console.log('Marcado habilitado para:', eligiblePlayers);
        setCanMark(true);
        // Verificar si este jugador está en la lista de elegibles
        const player = connectedPlayers.find(p => p.name === playerName);
        if (player && eligiblePlayers.includes(player.id)) {
          setIsEligibleToMark(true);
        }
      },
      markingDisabled: () => {
        console.log('Marcado deshabilitado');
        setCanMark(false);
        setIsEligibleToMark(false);
      },
      gameStarted: () => {
        console.log('Juego iniciado');
        setGamePhase('playing');
        // Asegurarnos de tener un tablero al iniciar
        if (board.length === 0) {
          setBoard(generateValidBoard());
        }
      },
      gameStartFailed: () => {
        console.log('Inicio de juego fallido');
        setGamePhase('waiting');
      },
      error: (error) => {
        console.error('Error en socket:', error);
        setConnectionError(error.message);
      }
    };

    // Registrar handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      gameSocket.on(event, handler);
    });

    // Intentar unirse al juego
    joinGame();

    // Limpieza
    return () => {
      Object.keys(handlers).forEach(event => {
        gameSocket.off(event);
      });
      gameSocket.disconnect();
    };
  }, [joinGame, generateValidBoard, board.length, connectedPlayers, playerName]);

  return {
    board,
    connectedPlayers,
    currentCategory,
    currentSong,
    canMark: canMark && isEligibleToMark,
    hasWinner,
    connectionError,
    gamePhase,
    predictions,
    songStarted,
    handleCellClick,
    handlePrediction,
    setConnectionError,
    isEligibleToMark
  };
};