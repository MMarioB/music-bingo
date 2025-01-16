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
    <div className="min-h-screen bg-[#1a0133] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Fondo con cuadrícula tipo disco */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, #ff00ee 1px, transparent 1px),
            linear-gradient(to bottom, #ff00ee 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'bottom'
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-[90%] max-w-sm mx-auto bg-black/40 backdrop-blur-lg rounded-xl shadow-xl overflow-hidden border border-white/10"
      >
        <div className="bg-black/60 p-4">
          <h1 className="text-2xl font-bold text-center mb-1"
              style={{
                color: '#fff',
                textShadow: '0 0 10px rgba(255,255,255,0.8)'
              }}>
            Sala de Music Bingo
          </h1>
          <p className="text-center text-purple-300 font-mono">
            Código de sala: <span className="text-white font-bold">{roomCode}</span>
          </p>
        </div>

        {connectionError && (
          <Alert variant="destructive" className="mx-4 mt-4 bg-red-500/20 border border-red-500/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-white">{connectionError}</AlertDescription>
          </Alert>
        )}

        <div className="p-4 space-y-4">
          {!isHost && !isReady && (
            <Button
              onClick={handleSetReady}
              disabled={isSettingReady}
              className="w-full h-12 bg-green-500/80 hover:bg-green-500 backdrop-blur-sm border border-green-400 transition-all duration-300"
              style={{ boxShadow: '0 0 15px rgba(0,255,0,0.3)' }}
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
            <Card className="bg-black/30 border border-white/20 p-4 space-y-4">
              <h3 className="font-semibold text-lg text-white text-center">
                Configuración de la Partida
              </h3>

              <RadioGroup
                value={selectedDifficulty}
                onValueChange={handleDifficultyChange}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="principiante"
                    id="principiante"
                    className="border-green-400 text-green-400"
                  />
                  <Label htmlFor="principiante" className="text-green-400">
                    Principiante
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="experto"
                    id="experto"
                    className="border-purple-400 text-purple-400"
                  />
                  <Label htmlFor="experto" className="text-purple-400">
                    Experto
                  </Label>
                </div>
              </RadioGroup>

              <Button
                onClick={handleStartGame}
                className={`w-full h-12 transition-all duration-300 ${
                  allPlayersReady && players.length >= 2
                    ? 'bg-gradient-to-r from-green-500/80 to-emerald-500/80 hover:from-green-500 hover:to-emerald-500 border border-green-400'
                    : 'bg-gray-500/50 border border-gray-400'
                }`}
                style={
                  allPlayersReady && players.length >= 2
                    ? { boxShadow: '0 0 15px rgba(0,255,0,0.3)' }
                    : {}
                }
                disabled={!allPlayersReady || players.length < 2 || isJoining}
              >
                {isJoining ? 'Conectando...' : 'Comenzar Partida'}
              </Button>

              {players.length < 2 && !isJoining && (
                <p className="text-sm text-gray-300 text-center">
                  Se necesitan al menos 2 jugadores para comenzar
                </p>
              )}
              {!allPlayersReady && players.length >= 2 && (
                <p className="text-sm text-gray-300 text-center">
                  Esperando a que todos los jugadores estén listos
                </p>
              )}
            </Card>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg text-white">
                Jugadores en la Sala
              </h3>
              <div className="flex items-center gap-2 text-white/80 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                <Users className="w-4 h-4" />
                <span>{players.length}</span>
              </div>
            </div>

            <div className="bg-black/30 rounded-lg divide-y divide-white/10 border border-white/20">
              {players.length > 0 ? (
                players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {player.name}
                        {player.name === playerName && (
                          <span className="text-purple-400 ml-1">(Tú)</span>
                        )}
                      </span>
                      {(player.ready || player.isHost) && (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      )}
                    </div>
                    {player.isHost && (
                      <span className="text-xs bg-purple-500/30 text-purple-200 px-2 py-1 rounded-full border border-purple-400/50">
                        Anfitrión
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-3 text-gray-400 text-center">
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