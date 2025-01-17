import { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { AlertCircle, Users, CheckCircle, Loader2 } from 'lucide-react';
import { gameSocket } from '../services/socketService';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const GameRoom = ({ roomCode, playerName, isHost, onStartGame }) => {
  const [players, setPlayers] = useState([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState('principiante');
  const [isJoining, setIsJoining] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isSettingReady, setIsSettingReady] = useState(false);

  const handleJoinRoom = useCallback(async () => {
    try {
      setIsJoining(true);
      setConnectionError(null);

      await gameSocket.connect();
      console.log('Conectado al servidor');

      if (isHost) {
        console.log('Creando sala como anfitrión');
        await gameSocket.createRoom({
          roomCode,
          difficulty: selectedDifficulty,
          maxPlayers: 12
        });
      } else {
        console.log('Uniéndose a sala como jugador');
        await gameSocket.joinRoom(roomCode, {
          name: playerName,
          difficulty: selectedDifficulty
        });
      }

      setIsJoining(false);
    } catch (error) {
      console.error('Error al unirse/crear sala:', error);
      setConnectionError(error.message || 'Error de conexión');
      setIsJoining(false);
    }
  }, [roomCode, playerName, isHost, selectedDifficulty]);

  const handleSetReady = async () => {
    try {
      setIsSettingReady(true);
      await gameSocket.setPlayerReady(roomCode);
      setIsReady(true);
    } catch (error) {
      console.error('Error al marcar como listo:', error);
      setConnectionError(error.message);
    } finally {
      setIsSettingReady(false);
    }
  };

  useEffect(() => {
    const handlers = {
      playersUpdate: ({ players }) => {
        console.log('Actualización de jugadores:', players);
        setPlayers(players);
        // Actualizar el estado ready si es el jugador actual
        const currentPlayer = players.find(p => p.name === playerName);
        if (currentPlayer) {
          setIsReady(currentPlayer.ready || false);
        }
      },
      gameStarted: ({ difficulty }) => {
        console.log('Juego iniciado con dificultad:', difficulty);
        onStartGame({
          difficulty
        });
      },
      gameStartFailed: (error) => {
        console.error('Error al iniciar el juego:', error);
        setConnectionError(error.message || 'No se pudo iniciar el juego');
      },
      error: (error) => {
        console.error('Error recibido:', error);
        setConnectionError(error.message);
        setIsJoining(false);
      },
      disconnect: () => {
        console.log('Desconexión detectada');
        setConnectionError('Conexión perdida');
        setIsJoining(false);
      },
      hostDisconnected: () => {
        console.log('Anfitrión desconectado');
        setConnectionError('El anfitrión se ha desconectado');
        setIsJoining(false);
      }
    };

    // Registrar handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      gameSocket.on(event, handler);
    });

    // Intentar unirse a la sala
    handleJoinRoom();

    // Limpieza
    return () => {
      Object.keys(handlers).forEach(event => {
        gameSocket.off(event);
      });
      gameSocket.disconnect();
    };
  }, [handleJoinRoom, onStartGame, playerName]);

  const handleStartGame = async () => {
    if (!isHost || players.length < 2) return;

    // Verificar que todos los jugadores estén listos
    const allPlayersReady = players.every(player => player.isHost || player.ready);
    if (!allPlayersReady) {
      setConnectionError('No todos los jugadores están listos');
      return;
    }

    try {
      setConnectionError(null); // Limpiar errores previos
      console.log('Iniciando juego...', {
        roomCode,
        difficulty: selectedDifficulty
      });
      await gameSocket.startGame({
        roomCode,
        difficulty: selectedDifficulty
      });
    } catch (error) {
      console.error('Error al iniciar el juego:', error);
      setConnectionError(error.message);
    }
  };

  const handleDifficultyChange = async (newDifficulty) => {
    if (!isHost) return;

    try {
      setSelectedDifficulty(newDifficulty);
      await gameSocket.updateRoom({
        roomCode,
        difficulty: newDifficulty
      });
    } catch (error) {
      console.error('Error al cambiar dificultad:', error);
      setConnectionError(error.message);
    }
  };

  const allPlayersReady = players.every(player => player.isHost || player.ready);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-3 md:p-6 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl bg-white/80 backdrop-blur-lg rounded-xl shadow-xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 md:p-6">
          <h1 className="text-xl md:text-3xl font-bold text-center text-white drop-shadow-md">
            Sala de Music Bingo
          </h1>
          <p className="text-center text-white/80 mt-2">
            Código de sala: {roomCode}
          </p>
        </div>

        {connectionError && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{connectionError}</AlertDescription>
          </Alert>
        )}

        <div className="p-4 md:p-6 space-y-6">
          {!isHost && !isReady && (
            <Button
              onClick={handleSetReady}
              disabled={isSettingReady}
              className="w-full bg-green-500 hover:bg-green-600"
            >
              {isSettingReady ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparando...
                </>
              ) : (
                '¡Estoy listo!'
              )}
            </Button>
          )}

          {isHost && (
            <Card className="p-4 space-y-4">
              <h3 className="font-semibold text-lg">Configuración de la Partida</h3>
              <RadioGroup
                value={selectedDifficulty}
                onValueChange={handleDifficultyChange}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="principiante" id="principiante" />
                  <Label htmlFor="principiante">Principiante</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="experto" id="experto" />
                  <Label htmlFor="experto">Experto</Label>
                </div>
              </RadioGroup>
              <Button
                onClick={handleStartGame}
                className={`w-full ${allPlayersReady
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                  : 'bg-gray-400'}`}
                disabled={!allPlayersReady || players.length < 2 || isJoining}
              >
                {isJoining ? 'Conectando...' : 'Comenzar Partida'}
              </Button>
              {players.length < 2 && !isJoining && (
                <p className="text-sm text-gray-500 text-center">
                  Se necesitan al menos 2 jugadores para comenzar
                </p>
              )}
              {!allPlayersReady && players.length >= 2 && (
                <p className="text-sm text-gray-500 text-center">
                  Esperando a que todos los jugadores estén listos
                </p>
              )}
            </Card>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                Jugadores en la Sala
              </h3>
              <div className="flex items-center gap-2 text-gray-600 bg-white/50 px-3 py-1 rounded-full">
                <Users className="w-4 h-4" />
                <span>{players.length}</span>
              </div>
            </div>
            <div className="bg-white/50 rounded-lg divide-y divide-gray-200">
              {players.length > 0 ? (
                players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {player.name}
                        {player.name === playerName && " (Tú)"}
                      </span>
                      {(player.ready || player.isHost) && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    {player.isHost && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                        Anfitrión
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-3 text-gray-500 text-center">
                  {isJoining ? 'Conectando...' : 'Esperando jugadores...'}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

GameRoom.propTypes = {
  roomCode: PropTypes.string.isRequired,
  playerName: PropTypes.string.isRequired,
  isHost: PropTypes.bool.isRequired,
  onStartGame: PropTypes.func.isRequired
};

export default GameRoom;