import { useState, useCallback, useEffect, useRef } from 'react';
import { gameSocket } from '../../services/socketService';
import { BOARD_SIZE, MIN_DIFFERENT_CATEGORIES, CATEGORIES_A, CATEGORIES_B } from '../Wheel/constants';

const generateValidBoard = (difficulty) => {
    const categories = difficulty === 'experto' ? CATEGORIES_B : CATEGORIES_A;
    const cells = [];
    categories.forEach(category => {
        for (let i = 0; i < 5; i++) cells.push({ ...category, marked: false });
    });
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    return cells;
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
    });
    const [board, setBoard] = useState([]);
    const [error, setError] = useState(null);
    const [myPredictions, setMyPredictions] = useState([]);
    const [hasMarkedInCurrentRound, setHasMarkedInCurrentRound] = useState(false);
    const boardGenerated = useRef(false);
    const previousMarkingEnabled = useRef(false);

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
        const hasMoreThanTwoOfSameCategory = Object.values(categoryCounts).some(count => count > 2);
        if (hasMoreThanTwoOfSameCategory) return false;
        const differentCategories = Object.keys(categoryCounts).length;
        return differentCategories >= MIN_DIFFERENT_CATEGORIES;
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

    useEffect(() => {
        if (!boardGenerated.current) {
            setBoard(generateValidBoard(difficulty));
            boardGenerated.current = true;
        }

        const handleGameStateUpdate = (serverState) => {
            console.log('PLAYER VIEW recibió gameStateUpdate:', serverState);
            // Si la nueva ronda empieza, limpiamos las predicciones locales.
            if (!serverState.currentCategory && gameState.currentCategory) {
                setMyPredictions([]);
            }
            setGameState(prevState => ({ ...prevState, ...serverState }));
        };

        const handleError = (err) => {
            console.error('Socket error:', err);
            setError(err.message || 'Error del servidor');
        };

        // Manejadores para eventos específicos del servidor
        const handleMarkingEnabled = () => {
            console.log('Marking enabled');
            setGameState(prev => ({ ...prev, isMarkingEnabled: true }));
        };

        const handleMarkingDisabled = () => {
            console.log('Marking disabled');
            setGameState(prev => ({ ...prev, isMarkingEnabled: false }));
        };

        const handlePlayerMarked = (data) => {
            console.log('Player marked correct:', data);
            setGameState(prev => ({
                ...prev,
                playerCorrectStatus: {
                    ...prev.playerCorrectStatus,
                    [data.playerId]: data.correct
                }
            }));
        };

        // Registrar todos los event listeners
        gameSocket.on('gameStateUpdate', handleGameStateUpdate);
        gameSocket.on('error', handleError);
        gameSocket.on('markingEnabled', handleMarkingEnabled);
        gameSocket.on('markingDisabled', handleMarkingDisabled);
        gameSocket.on('playerMarkedCorrect', handlePlayerMarked);

        return () => {
            // Limpiar todos los event listeners
            gameSocket.off('gameStateUpdate', handleGameStateUpdate);
            gameSocket.off('error', handleError);
            gameSocket.off('markingEnabled', handleMarkingEnabled);
            gameSocket.off('markingDisabled', handleMarkingDisabled);
            gameSocket.off('playerMarkedCorrect', handlePlayerMarked);
        };
    }, [difficulty, gameState.currentCategory]);

    // Resetear el flag de marcado cuando se habilita una nueva ronda de marcado
    useEffect(() => {
        // Detectar cuando isMarkingEnabled cambia de false a true (nueva ronda de marcado)
        if (gameState.isMarkingEnabled && !previousMarkingEnabled.current) {
            console.log('🔄 Nueva ronda de marcado iniciada, reseteando flag');
            setHasMarkedInCurrentRound(false);
        }
        previousMarkingEnabled.current = gameState.isMarkingEnabled;
    }, [gameState.isMarkingEnabled]);

    const handleCellClick = useCallback(async (index) => {
        if (!gameState.isMarkingEnabled) {
            console.log('Marking not enabled');
            return;
        }

        const player = gameState.connectedPlayers.find(p => p.name === playerName);
        if (!player) {
            console.log('Player not found');
            return;
        }

        if (!gameState.playerCorrectStatus[player.id]) {
            console.log('Player not marked as correct');
            return;
        }

        // Verificar si ya marcó una celda en esta ronda
        if (hasMarkedInCurrentRound) {
            console.log('⚠️ Ya has marcado una celda en esta ronda de marcado');
            return;
        }

        setBoard(prevBoard => {
            const newBoard = [...prevBoard];
            const cell = newBoard[index];

            // Permitir marcar/desmarcar celdas de la categoría actual
            if (gameState.currentCategory && cell.name === gameState.currentCategory.name) {

                // Solo permitir marcar, no desmarcar (si ya está marcada, ignorar)
                if (cell.marked) {
                    console.log('⚠️ Esta celda ya está marcada');
                    return prevBoard;
                }

                // Marcar la celda
                newBoard[index] = { ...cell, marked: true };

                // Marcar que ya usamos nuestra marca para esta ronda
                setHasMarkedInCurrentRound(true);
                console.log('✅ Celda marcada, flag de ronda activado');

                if (checkWinner(newBoard)) {
                    console.log('Winner detected, sending to server');
                    gameSocket.declareWinner({ roomCode, playerName })
                        .then(response => {
                            if (response && response.success === false) {
                                console.error('Error declaring winner:', response.error);
                                setError('Error al declarar ganador');
                            }
                        })
                        .catch(error => {
                            console.error('Error declaring winner:', error);
                            setError('Error al declarar ganador');
                        });
                }
                return newBoard;
            }
            return prevBoard;
        });
    }, [gameState, checkWinner, roomCode, playerName, hasMarkedInCurrentRound]);

    const handlePrediction = useCallback(async (prediction) => {
        setMyPredictions(prev => [...prev, prediction]);
        try {
            await gameSocket.submitPrediction({ roomCode, prediction });
        } catch (error) {
            console.error('Error submitting prediction:', error);
            setError('Error al enviar predicción');
        }
    }, [roomCode]);

    return {
        board,
        ...gameState,
        myPredictions,
        error,
        setError,
        handleCellClick,
        handlePrediction,
        hasMarkedInCurrentRound,
    };
};