import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { gameSocket } from '../services/socketService';

export const useGameRoomLogic = ({ roomCode, playerName, isHost, onStartGame }) => {
    const [gameState, setGameState] = useState({
        players: [],
        difficulty: 'principiante',
        allPlayersReady: false,
        gameStep: null,
    });
    const [error, setError] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    const hasConnected = useRef(false);
    const lastDifficultyUsed = useRef('principiante');

    const handleGameStateUpdate = useCallback(async (newGameState) => {
        if (newGameState.difficulty !== undefined) {
            lastDifficultyUsed.current = newGameState.difficulty;
        }

        setGameState(prevState => {
            const newStep = newGameState.gameStep || prevState.gameStep;
            const previousStep = prevState.gameStep;

            if (
                !isHost &&
                newStep === 'wheel' &&
                previousStep !== 'wheel' &&
                newGameState.difficulty === undefined
            ) {
                gameSocket.joinRoom(roomCode, { name: playerName, reconnecting: true })
                    .then((roomInfo) => {
                        if (roomInfo && roomInfo.config && roomInfo.config.difficulty) {
                            lastDifficultyUsed.current = roomInfo.config.difficulty;
                        }
                    })
                    .catch(() => {});
            }

            return {
                ...prevState,
                players: newGameState.connectedPlayers || prevState.players,
                difficulty: newGameState.difficulty !== undefined ? newGameState.difficulty : prevState.difficulty,
                allPlayersReady: (newGameState.connectedPlayers || []).every(p => p.ready || p.isHost),
                gameStep: newStep,
            };
        });
    }, [isHost, roomCode, playerName]);

    useEffect(() => {
        if (hasConnected.current) return;

        const connectAndJoin = async () => {
            try {
                setError(null);
                await gameSocket.connect();
                hasConnected.current = true;

                let roomInfo;
                if (isHost) {
                    roomInfo = await gameSocket.createRoom({ roomCode });
                } else {
                    roomInfo = await gameSocket.joinRoom(roomCode, { name: playerName });
                }

                const initialDifficulty = roomInfo.config?.difficulty || 'principiante';
                setGameState(prevState => ({
                    ...prevState,
                    players: roomInfo.players || [],
                    difficulty: initialDifficulty,
                }));
                lastDifficultyUsed.current = initialDifficulty;
                setIsConnected(true);

            } catch (err) {
                console.error('Error al conectar o unirse a la sala:', err);
                setError(err.message || 'No se pudo conectar a la sala.');
            }
        };

        connectAndJoin();
    }, [roomCode, playerName, isHost]);

    useEffect(() => {
        gameSocket.on('gameStateUpdate', handleGameStateUpdate);
        gameSocket.on('error', (err) => setError(err.message));
        gameSocket.on('hostDisconnected', () => setError('El anfitrión se ha desconectado.'));

        return () => {
            gameSocket.off('gameStateUpdate');
            gameSocket.off('error');
            gameSocket.off('hostDisconnected');
        };
    }, [handleGameStateUpdate]);

    useEffect(() => {
        if (gameState.gameStep === 'wheel' || gameState.gameStep === 'card') {
            onStartGame({ difficulty: lastDifficultyUsed.current });
        }
    }, [gameState.gameStep, onStartGame]);

    const handleSetReady = useCallback(() => {
        gameSocket.setPlayerReady(roomCode);
    }, [roomCode]);

    const handleStartGame = useCallback((musicThemes = null) => {
        lastDifficultyUsed.current = gameState.difficulty;

        const selectedThemes = musicThemes
            ? Object.keys(musicThemes).filter(theme => musicThemes[theme])
            : null;

        gameSocket.startGame({
            roomCode,
            difficulty: gameState.difficulty,
            musicThemes: selectedThemes
        });
    }, [roomCode, gameState.difficulty]);

    const handleDifficultyChange = useCallback(async (newDifficulty) => {
        setGameState(prev => ({ ...prev, difficulty: newDifficulty }));
        lastDifficultyUsed.current = newDifficulty;
        try {
            await gameSocket.updateRoom({ roomCode, difficulty: newDifficulty });
        } catch (err) {
            console.error('Error updating difficulty:', err);
            setError('No se pudo actualizar la dificultad.');
        }
    }, [roomCode]);

    return useMemo(() => ({
        ...gameState,
        error,
        isConnected,
        handleSetReady,
        handleStartGame,
        handleDifficultyChange,
    }), [gameState, error, isConnected, handleSetReady, handleStartGame, handleDifficultyChange]);
};
