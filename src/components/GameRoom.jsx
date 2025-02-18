import { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { AlertCircle, Users, CheckCircle, Crown, Loader2 } from 'lucide-react';
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
      setConnectionError(null);
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
    <div className="min-h-screen bg-[#1a0133] flex flex-col items-center justify-center relative overflow-hidden p-4">
      {/* Fondo con cuadrícula */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(to right, #ff00ee 1px, transparent 1px),
            linear-gradient(to bottom, #ff00ee 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'bottom'
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-auto"
      >
        {/* Header con información de la sala */}
        <div className="bg-black/40 backdrop-blur-lg rounded-xl p-4 mb-4 border border-white/10">
          <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Music Bingo</h1>
              <div className="flex items-center gap-2">
                <span className="text-purple-300 text-sm">Sala:</span>
                <span className="text-white font-mono font-bold">{roomCode}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-white/80 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                <Users className="w-4 h-4" />
                <span>{players.length}</span>
              </div>
              {isHost && (
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full border border-purple-400/30">
                  Game Master
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Panel de error */}
        {connectionError && (
          <Alert variant="destructive" className="mb-4 bg-red-500/10 border border-red-500/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-white">{connectionError}</AlertDescription>
          </Alert>
        )}

        {/* Contenido principal */}
        <div className="space-y-4">
          {!isHost && !isReady && (
            <Button
              onClick={handleSetReady}
              disabled={isSettingReady}
              className="w-full h-12 bg-gradient-to-r from-green-500/60 to-emerald-500/60 hover:from-green-500/80 hover:to-emerald-500/80 border border-green-400"
              style={{ boxShadow: '0 0 15px rgba(0,255,0,0.2)' }}
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

          {/* Configuración del host */}
          {isHost && (
            <Card className="bg-black/40 border-white/20 p-4 space-y-4">
              <RadioGroup
                value={selectedDifficulty}
                onValueChange={handleDifficultyChange}
                className="grid grid-cols-2 gap-4 mb-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="principiante" id="principiante" className="border-green-400 text-green-400" />
                  <Label htmlFor="principiante" className="text-green-400">Principiante</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="experto" id="experto" className="border-purple-400 text-purple-400" />
                  <Label htmlFor="experto" className="text-purple-400">Experto</Label>
                </div>
              </RadioGroup>

              <Button
                onClick={handleStartGame}
                className={`w-full h-12 transition-all duration-300 ${
                  allPlayersReady && players.length >= 2
                    ? 'bg-gradient-to-r from-green-500/60 to-emerald-500/60 hover:from-green-500/80 hover:to-emerald-500/80 border border-green-400'
                    : 'bg-gray-500/30 border border-gray-400'
                }`}
                style={
                  allPlayersReady && players.length >= 2
                    ? { boxShadow: '0 0 15px rgba(0,255,0,0.2)' }
                    : {}
                }
                disabled={!allPlayersReady || players.length < 2 || isJoining}
              >
                {isJoining ? 'Conectando...' : 'Comenzar Partida'}
              </Button>

              {(players.length < 2 || !allPlayersReady) && (
                <div className="text-sm text-center space-y-1">
                  {players.length < 2 && (
                    <p className="text-yellow-300">Se necesitan al menos 2 jugadores</p>
                  )}
                  {!allPlayersReady && players.length >= 2 && (
                    <p className="text-yellow-300">Esperando que todos estén listos</p>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Lista de jugadores */}
          <div className="bg-black/40 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <h3 className="font-medium text-white">Jugadores</h3>
              <div className="flex items-center gap-2 text-white/60 text-sm">
                {players.length}/12
              </div>
            </div>

            <div className="divide-y divide-white/10">
              {players.map((player) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-2">
                    {player.isHost ? (
                      <Crown className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <div className={`w-2 h-2 rounded-full ${player.ready ? 'bg-green-400' : 'bg-gray-400'}`} />
                    )}
                    <span className="font-medium text-white">
                      {player.name}
                      {player.name === playerName && (
                        <span className="text-purple-400 ml-1">(Tú)</span>
                      )}
                    </span>
                  </div>
                  {(player.ready || player.isHost) && (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  )}
                </motion.div>
              ))}

              {players.length === 0 && (
                <div className="p-4 text-center text-white/60">
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