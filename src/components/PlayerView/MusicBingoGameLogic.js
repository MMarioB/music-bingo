import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { gameSocket } from '../../services/socketService';
import { useGameSounds } from '../../hooks/useGameSounds';
import { useConfetti } from '../../hooks/useConfetti';
import { BOARD_SIZE, MIN_DIFFERENT_CATEGORIES, CATEGORIES_A, CATEGORIES_B } from '../Wheel/constants';

// Verifica que no haya más de UN PAR de casillas consecutivas de cada categoría
const hasMaxOnePairPerCategory = (board, position, categoryName, categoryPairsCount) => {
    const row = Math.floor(position / BOARD_SIZE);
    const col = position % BOARD_SIZE;
    let pairsWouldForm = 0;

    if (col > 0 && board[position - 1]?.name === categoryName) pairsWouldForm++;
    if (row > 0 && board[position - BOARD_SIZE]?.name === categoryName) pairsWouldForm++;
    if (row > 0 && col > 0 && board[position - BOARD_SIZE - 1]?.name === categoryName) pairsWouldForm++;
    if (row > 0 && col < BOARD_SIZE - 1 && board[position - BOARD_SIZE + 1]?.name === categoryName) pairsWouldForm++;

    return (categoryPairsCount[categoryName] || 0) + pairsWouldForm <= 1;
};

const updateCategoryPairsCount = (board, position, categoryName, categoryPairsCount) => {
    const row = Math.floor(position / BOARD_SIZE);
    const col = position % BOARD_SIZE;
    let pairsFormed = 0;

    if (col > 0 && board[position - 1]?.name === categoryName) pairsFormed++;
    if (row > 0 && board[position - BOARD_SIZE]?.name === categoryName) pairsFormed++;
    if (row > 0 && col > 0 && board[position - BOARD_SIZE - 1]?.name === categoryName) pairsFormed++;
    if (row > 0 && col < BOARD_SIZE - 1 && board[position - BOARD_SIZE + 1]?.name === categoryName) pairsFormed++;

    if (pairsFormed > 0) {
        categoryPairsCount[categoryName] = (categoryPairsCount[categoryName] || 0) + pairsFormed;
    }
};

const hasExactlyOneWinnableLine = (board) => {
    let winningLinesCount = 0;

    for (let i = 0; i < BOARD_SIZE; i++) {
        const row = board.slice(i * BOARD_SIZE, (i + 1) * BOARD_SIZE);
        if (new Set(row.map(cell => cell.name)).size === 5) winningLinesCount++;
    }

    for (let col = 0; col < BOARD_SIZE; col++) {
        const column = Array(BOARD_SIZE).fill(0).map((_, row) => board[row * BOARD_SIZE + col]);
        if (new Set(column.map(cell => cell.name)).size === 5) winningLinesCount++;
    }

    const diag1 = Array(BOARD_SIZE).fill(0).map((_, i) => board[i * BOARD_SIZE + i]);
    if (new Set(diag1.map(cell => cell.name)).size === 5) winningLinesCount++;

    const diag2 = Array(BOARD_SIZE).fill(0).map((_, i) => board[i * BOARD_SIZE + (BOARD_SIZE - 1 - i)]);
    if (new Set(diag2.map(cell => cell.name)).size === 5) winningLinesCount++;

    return winningLinesCount === 1;
};

const generateValidBoard = (difficulty) => {
    const categories = difficulty === 'experto' ? CATEGORIES_B : CATEGORIES_A;

    const pool = [];
    categories.forEach(category => {
        for (let i = 0; i < 5; i++) {
            pool.push({ ...category, marked: false });
        }
    });

    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
        attempts++;

        const shuffledPool = [...pool];
        for (let i = shuffledPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
        }

        const board = [];
        const categoryPairsCount = {};
        let valid = true;

        for (let pos = 0; pos < 25; pos++) {
            let placed = false;
            for (let i = 0; i < shuffledPool.length; i++) {
                const category = shuffledPool[i];
                if (hasMaxOnePairPerCategory(board, pos, category.name, categoryPairsCount)) {
                    board.push(category);
                    updateCategoryPairsCount(board, pos, category.name, categoryPairsCount);
                    shuffledPool.splice(i, 1);
                    placed = true;
                    break;
                }
            }
            if (!placed) { valid = false; break; }
        }

        if (valid && board.length === 25 && hasExactlyOneWinnableLine(board)) {
            return board;
        }
    }

    // Fallback
    const fallbackPool = [...pool];
    for (let i = fallbackPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fallbackPool[i], fallbackPool[j]] = [fallbackPool[j], fallbackPool[i]];
    }
    return fallbackPool;
};

export const useMusicBingoLogic = ({ playerName, roomCode, difficulty }) => {
    const [gameState, setGameState] = useState({
        gameStep: 'waiting',
        connectedPlayers: [],
        currentCategory: null,
        currentSong: null,
        isMarkingEnabled: false,
        playerCorrectStatus: {},
        gameOver: false,
        winners: [],
        difficulty: difficulty || 'principiante',
    });
    const [board, setBoard] = useState([]);
    const [error, setError] = useState(null);
    const [myPredictions, setMyPredictions] = useState([]);
    const [playerPredictions, setPlayerPredictions] = useState({});
    const [hasMarkedInCurrentRound, setHasMarkedInCurrentRound] = useState(false);
    const [markingJustDisabled, setMarkingJustDisabled] = useState(false);
    const [serverWaking, setServerWaking] = useState(false);
    const boardGenerated = useRef(false);
    const previousMarkingEnabled = useRef(false);
    const lastBoardDifficulty = useRef(null);

    // Refs para acceso estable en event handlers (evitar stale closures)
    const gameStateRef = useRef(gameState);
    gameStateRef.current = gameState;
    const playerNameRef = useRef(playerName);
    playerNameRef.current = playerName;
    const hasMarkedRef = useRef(hasMarkedInCurrentRound);
    hasMarkedRef.current = hasMarkedInCurrentRound;

    const sounds = useGameSounds();
    const confetti = useConfetti();

    // Listen for server waking events
    useEffect(() => {
        const handleServerWaking = (event) => {
            setServerWaking(true);
            setError(event.detail?.message || '⏳ El servidor está despertando...');
        };
        const handleServerAwake = () => {
            setServerWaking(false);
            setError(null);
        };
        window.addEventListener('serverWaking', handleServerWaking);
        window.addEventListener('serverAwake', handleServerAwake);
        return () => {
            window.removeEventListener('serverWaking', handleServerWaking);
            window.removeEventListener('serverAwake', handleServerAwake);
        };
    }, []);

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
        if (Object.values(categoryCounts).some(count => count > 2)) return false;
        return Object.keys(categoryCounts).length >= MIN_DIFFERENT_CATEGORIES;
    }, []);

    const checkWinner = useCallback((newBoard) => {
        for (let i = 0; i < BOARD_SIZE; i++) {
            if (validateLine(newBoard.slice(i * BOARD_SIZE, (i + 1) * BOARD_SIZE))) return true;
            const column = Array(BOARD_SIZE).fill(0).map((_, j) => newBoard[j * BOARD_SIZE + i]);
            if (validateLine(column)) return true;
        }
        const diag1 = Array(BOARD_SIZE).fill(0).map((_, i) => newBoard[i * BOARD_SIZE + i]);
        const diag2 = Array(BOARD_SIZE).fill(0).map((_, i) => newBoard[i * BOARD_SIZE + (BOARD_SIZE - 1 - i)]);
        return validateLine(diag1) || validateLine(diag2);
    }, [validateLine]);

    // Generar tablero SOLO una vez al inicio
    useEffect(() => {
        if (!boardGenerated.current) {
            setBoard(generateValidBoard(difficulty));
            boardGenerated.current = true;
            lastBoardDifficulty.current = difficulty;
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // SOLO regenerar tablero si difficulty REALMENTE cambió
    useEffect(() => {
        if (
            boardGenerated.current &&
            difficulty !== lastBoardDifficulty.current &&
            (gameState.gameStep === 'waiting' || gameState.gameStep === 'wheel')
        ) {
            setBoard(generateValidBoard(difficulty));
            lastBoardDifficulty.current = difficulty;
            setGameState(prev => ({ ...prev, difficulty }));
        }
    }, [difficulty, gameState.gameStep]);

    // Socket event handlers - usa refs para evitar stale closures
    // Dependencias mínimas: solo hooks estables (sounds/confetti)
    useEffect(() => {
        const handleGameStateUpdate = (serverState) => {
            setGameState(prevState => {
                const updates = { ...prevState, ...serverState };

                if (serverState.playerCorrectStatus !== undefined) {
                    updates.playerCorrectStatus = {
                        ...prevState.playerCorrectStatus,
                        ...serverState.playerCorrectStatus
                    };
                }

                if (!serverState.currentCategory && prevState.currentCategory) {
                    setMyPredictions([]);
                    setPlayerPredictions({});
                }

                return updates;
            });
        };

        const handleError = (err) => {
            console.error('Socket error:', err);
            setError(err.message || 'Error del servidor');
        };

        const handleMarkingEnabled = () => {
            const state = gameStateRef.current;
            const name = playerNameRef.current;
            const currentPlayer = state.connectedPlayers.find(p => p.name === name);

            if (currentPlayer && state.playerCorrectStatus[currentPlayer.id]) {
                sounds.playNotification();
            }
            setGameState(prev => ({ ...prev, isMarkingEnabled: true }));
        };

        const handleMarkingDisabled = () => {
            setGameState(prev => ({ ...prev, isMarkingEnabled: false }));
            setMarkingJustDisabled(true);
            setTimeout(() => setMarkingJustDisabled(false), 3000);
        };

        const handlePlayerMarked = (data) => {
            const state = gameStateRef.current;
            const name = playerNameRef.current;
            const currentPlayer = state.connectedPlayers.find(p => p.name === name);

            if (currentPlayer && data.playerId === currentPlayer.id && data.correct) {
                sounds.playSuccess();
                confetti.fireSuccessConfetti();
            }

            setGameState(prev => ({
                ...prev,
                playerCorrectStatus: {
                    ...prev.playerCorrectStatus,
                    [data.playerId]: data.correct
                }
            }));
        };

        const handlePlayerPrediction = ({ playerName: predPlayer, prediction }) => {
            setPlayerPredictions(prev => ({ ...prev, [predPlayer]: prediction }));
        };

        gameSocket.on('gameStateUpdate', handleGameStateUpdate);
        gameSocket.on('error', handleError);
        gameSocket.on('markingEnabled', handleMarkingEnabled);
        gameSocket.on('markingDisabled', handleMarkingDisabled);
        gameSocket.on('playerMarkedCorrect', handlePlayerMarked);
        gameSocket.on('playerPrediction', handlePlayerPrediction);

        return () => {
            gameSocket.off('gameStateUpdate', handleGameStateUpdate);
            gameSocket.off('error', handleError);
            gameSocket.off('markingEnabled', handleMarkingEnabled);
            gameSocket.off('markingDisabled', handleMarkingDisabled);
            gameSocket.off('playerMarkedCorrect', handlePlayerMarked);
            gameSocket.off('playerPrediction', handlePlayerPrediction);
        };
    }, [sounds, confetti]);

    // Resetear flag de marcado cuando se habilita nueva ronda
    useEffect(() => {
        if (gameState.isMarkingEnabled && !previousMarkingEnabled.current) {
            setHasMarkedInCurrentRound(false);
        }
        previousMarkingEnabled.current = gameState.isMarkingEnabled;
    }, [gameState.isMarkingEnabled]);

    // Detectar cuando el jugador NO acierta (sonido de error)
    useEffect(() => {
        const currentPlayer = gameState.connectedPlayers.find(p => p.name === playerName);
        if (!currentPlayer) return;

        const someoneMarkedCorrect = Object.values(gameState.playerCorrectStatus || {}).some(status => status === true);
        const thisPlayerCorrect = gameState.playerCorrectStatus[currentPlayer.id];

        if (gameState.currentSong?.revealed && someoneMarkedCorrect && !thisPlayerCorrect) {
            sounds.playError();
        }
    }, [gameState.currentSong?.revealed, gameState.playerCorrectStatus, gameState.connectedPlayers, playerName, sounds]);

    // Detectar nueva ronda (nueva canción)
    const previousSongRef = useRef(null);
    useEffect(() => {
        if (gameState.currentSong && gameState.currentSong !== previousSongRef.current) {
            if (previousSongRef.current !== null) {
                sounds.playNewRound();
                confetti.fireNewRoundConfetti();
            }
        }
        previousSongRef.current = gameState.currentSong;
    }, [gameState.currentSong, sounds, confetti]);

    const handleCellClick = useCallback(async (index) => {
        const state = gameStateRef.current;
        if (!state.isMarkingEnabled) return;

        const player = state.connectedPlayers.find(p => p.name === playerNameRef.current);
        if (!player || !state.playerCorrectStatus[player.id]) return;

        setBoard(prevBoard => {
            const newBoard = [...prevBoard];
            const cell = newBoard[index];

            if (state.currentCategory && cell.name === state.currentCategory.name) {
                if (cell.marked) {
                    if (hasMarkedRef.current) {
                        newBoard[index] = { ...cell, marked: false };
                        setHasMarkedInCurrentRound(false);
                        sounds.playMark();
                        return newBoard;
                    }
                    return prevBoard;
                }

                if (hasMarkedRef.current) return prevBoard;

                newBoard[index] = { ...cell, marked: true };
                setHasMarkedInCurrentRound(true);
                sounds.playMark();

                if (checkWinner(newBoard)) {
                    sounds.playBingo();
                    confetti.fireBingoConfetti();
                    gameSocket.declareWinner({ roomCode, playerName: playerNameRef.current })
                        .catch(() => setError('Error al declarar ganador'));
                }
                return newBoard;
            }
            return prevBoard;
        });
    }, [checkWinner, roomCode, sounds, confetti]);

    const handlePrediction = useCallback(async (prediction) => {
        setMyPredictions(prev => [...prev, prediction]);
        try {
            await gameSocket.submitPrediction({ roomCode, prediction });
        } catch (err) {
            console.error('Error submitting prediction:', err);
            setError('Error al enviar predicción');
        }
    }, [roomCode]);

    // === Control rotativo: detectar si este jugador es el controlador ===
    const isController = useMemo(() => {
        if (!gameState.currentControllerId) return false;
        const currentPlayer = gameState.connectedPlayers.find(p => p.name === playerName);
        return currentPlayer ? currentPlayer.id === gameState.currentControllerId : false;
    }, [gameState.currentControllerId, gameState.connectedPlayers, playerName]);

    const sendControllerAction = useCallback(async (action, payload = {}) => {
        try {
            await gameSocket.sendControllerAction({ roomCode, action, payload });
        } catch (err) {
            console.error('Error enviando acción de controlador:', err);
            setError('Error al enviar acción');
        }
    }, [roomCode]);

    return useMemo(() => ({
        board,
        ...gameState,
        myPredictions,
        playerPredictions,
        error,
        serverWaking,
        setError,
        handleCellClick,
        handlePrediction,
        hasMarkedInCurrentRound,
        markingJustDisabled,
        isController,
        sendControllerAction,
    }), [board, gameState, myPredictions, playerPredictions, error, serverWaking, handleCellClick, handlePrediction, hasMarkedInCurrentRound, markingJustDisabled, isController, sendControllerAction]);
};
