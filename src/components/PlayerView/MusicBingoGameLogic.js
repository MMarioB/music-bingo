import { useState, useCallback, useEffect, useRef } from 'react';
import { gameSocket } from '../../services/socketService';
import { useGameSounds } from '../../hooks/useGameSounds';
import { useConfetti } from '../../hooks/useConfetti';
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
    const [markingJustDisabled, setMarkingJustDisabled] = useState(false);
    const [serverWaking, setServerWaking] = useState(false);
    const boardGenerated = useRef(false);
    const previousMarkingEnabled = useRef(false);

    // Hooks de sonidos y confetti
    const sounds = useGameSounds();
    const confetti = useConfetti();

    // Listen for server waking events
    useEffect(() => {
        const handleServerWaking = (event) => {
            console.log('🔔 Player recibió serverWaking event');
            setServerWaking(true);
            setError(event.detail?.message || '⏳ El servidor está despertando...');
        };

        const handleServerAwake = () => {
            console.log('🔔 Player recibió serverAwake event');
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
    }, []); // Solo se ejecuta una vez al montar

    // BUGFIX: Regenerar tablero cuando cambie la dificultad ANTES de empezar el juego
    useEffect(() => {
        if (boardGenerated.current && gameState.gameStep !== 'playing') {
            console.log('🔄 Dificultad cambiada, regenerando tablero:', difficulty);
            setBoard(generateValidBoard(difficulty));
        }
    }, [difficulty, gameState.gameStep]);

    useEffect(() => {
        const handleGameStateUpdate = (serverState) => {
            console.log('📡 PLAYER VIEW recibió gameStateUpdate:', serverState);

            setGameState(prevState => {
                console.log('📊 Estado ANTERIOR:', {
                    playerCorrectStatus: prevState.playerCorrectStatus,
                    isMarkingEnabled: prevState.isMarkingEnabled,
                    currentSong: prevState.currentSong?.uri
                });

                // BUGFIX: Merge inteligente de playerCorrectStatus
                // No sobrescribir con objeto vacío si el servidor no envía datos
                const updates = { ...prevState, ...serverState };

                // Si el servidor envía playerCorrectStatus, hacer merge en lugar de reemplazar
                // Esto preserva el estado local mientras acepta actualizaciones del servidor
                if (serverState.playerCorrectStatus !== undefined) {
                    updates.playerCorrectStatus = {
                        ...prevState.playerCorrectStatus,
                        ...serverState.playerCorrectStatus
                    };
                    console.log('🔄 playerCorrectStatus después del MERGE:', updates.playerCorrectStatus);
                }

                // Si la nueva ronda empieza, limpiamos las predicciones locales
                if (!serverState.currentCategory && prevState.currentCategory) {
                    setMyPredictions([]);
                }

                console.log('📊 Estado NUEVO:', {
                    playerCorrectStatus: updates.playerCorrectStatus,
                    isMarkingEnabled: updates.isMarkingEnabled
                });

                return updates;
            });
        };

        const handleError = (err) => {
            console.error('Socket error:', err);
            setError(err.message || 'Error del servidor');
        };

        // Manejadores para eventos específicos del servidor
        const handleMarkingEnabled = () => {
            console.log('🟢 MARKING ENABLED recibido');

            // Tocar sonido de notificación si este jugador puede marcar
            const currentPlayer = gameState.connectedPlayers.find(p => p.name === playerName);
            console.log('🔍 Jugador actual al habilitar marcado:', currentPlayer);
            console.log('🔍 playerCorrectStatus al habilitar marcado:', gameState.playerCorrectStatus);

            if (currentPlayer && gameState.playerCorrectStatus[currentPlayer.id]) {
                console.log('✅ Este jugador puede marcar, reproduciendo notificación');
                sounds.playNotification();
            } else {
                console.log('❌ Este jugador NO puede marcar');
            }

            setGameState(prev => {
                console.log('📊 Habilitando marcado, estado actual:', prev.playerCorrectStatus);
                return { ...prev, isMarkingEnabled: true };
            });
        };

        const handleMarkingDisabled = () => {
            console.log('Marking disabled');
            setGameState(prev => ({ ...prev, isMarkingEnabled: false }));
            setMarkingJustDisabled(true);
            // Resetear el flag después de 3 segundos
            setTimeout(() => setMarkingJustDisabled(false), 3000);
        };

        const handlePlayerMarked = (data) => {
            console.log('🎯 Player marked correct:', data);

            // Tocar sonido de éxito y confetti si este jugador fue marcado como correcto
            const currentPlayer = gameState.connectedPlayers.find(p => p.name === playerName);
            if (currentPlayer && data.playerId === currentPlayer.id && data.correct) {
                sounds.playSuccess();
                confetti.fireSuccessConfetti();
            }

            setGameState(prev => {
                const newStatus = {
                    ...prev.playerCorrectStatus,
                    [data.playerId]: data.correct
                };
                console.log('📊 playerCorrectStatus DESPUÉS de marcar:', newStatus);
                return {
                    ...prev,
                    playerCorrectStatus: newStatus
                };
            });
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

    // Detectar cuando el jugador NO acierta (sonido de error)
    useEffect(() => {
        const currentPlayer = gameState.connectedPlayers.find(p => p.name === playerName);
        if (!currentPlayer) return;

        // Si la canción está revelada y hay alguien marcado como correcto pero este jugador no
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
                // No es la primera canción, es una nueva ronda
                sounds.playNewRound();
                confetti.fireNewRoundConfetti();
            }
        }
        previousSongRef.current = gameState.currentSong;
    }, [gameState.currentSong, sounds]);

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

        setBoard(prevBoard => {
            const newBoard = [...prevBoard];
            const cell = newBoard[index];

            // Permitir marcar/desmarcar celdas de la categoría actual
            if (gameState.currentCategory && cell.name === gameState.currentCategory.name) {

                // Si la celda ya está marcada, permitir desmarcársela SOLO si ya había marcado en esta ronda
                if (cell.marked) {
                    if (hasMarkedInCurrentRound) {
                        // Desmarcar la celda
                        newBoard[index] = { ...cell, marked: false };
                        setHasMarkedInCurrentRound(false);
                        sounds.playMark(); // Sonido al desmarcar
                        console.log('↩️ Celda desmarcada, flag de ronda reseteado');
                        return newBoard;
                    } else {
                        // Esta celda fue marcada en una ronda anterior, no se puede desmarcar
                        console.log('⚠️ Esta celda fue marcada en una ronda anterior, no se puede desmarcar');
                        return prevBoard;
                    }
                }

                // Si ya marcó una celda en esta ronda, no puede marcar otra
                if (hasMarkedInCurrentRound) {
                    console.log('⚠️ Ya has marcado una celda en esta ronda. Desmarca la anterior primero.');
                    return prevBoard;
                }

                // Marcar la celda
                newBoard[index] = { ...cell, marked: true };

                // Marcar que ya usamos nuestra marca para esta ronda
                setHasMarkedInCurrentRound(true);
                sounds.playMark(); // Sonido al marcar
                console.log('✅ Celda marcada, flag de ronda activado');

                if (checkWinner(newBoard)) {
                    console.log('Winner detected, sending to server');
                    sounds.playBingo(); // ¡BINGO!
                    confetti.fireBingoConfetti(); // 🎉 Confetti épico!
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
        serverWaking,
        setError,
        handleCellClick,
        handlePrediction,
        hasMarkedInCurrentRound,
        markingJustDisabled,
    };
};