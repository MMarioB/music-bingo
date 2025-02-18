import { useState, useCallback } from "react";
import MusicBingoGame from "../components/PlayerView/MusicBingoGame";
import GameMaster from "../components/GameMasterView/GameMaster";
import GameRoom from "../components/GameRoom";
import SpotifyAuth from "../components/Auth/SpotifyAuth";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import { AlertCircle, ArrowLeft, Music, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function App() {
  const [gameState, setGameState] = useState({
    phase: 'role-selection',
    selectedRole: null,
    playerName: '',
    roomCode: '',
    difficulty: 'principiante',
    error: null
  });

  const handleError = useCallback((errorMessage) => {
    setGameState(prev => ({
      ...prev,
      error: errorMessage
    }));
  }, []);

  const handleConnectionError = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      phase: prev.phase === 'game' ? 'waiting-room' : prev.phase,
      error: 'Error de conexión. Por favor, inténtalo de nuevo.'
    }));
  }, []);

  const handleRoomNotFound = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      phase: 'room-selection',
      error: 'Sala no encontrada. Verifica el código e inténtalo de nuevo.'
    }));
  }, []);

  const handleRoleSelect = (role) => {
    if (role === 'master') {
      setGameState(prev => ({
        ...prev,
        selectedRole: role,
        phase: 'spotify-auth',
        error: null
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        selectedRole: role,
        phase: 'name-input',
        error: null
      }));
    }
  };

  const handleNameSubmit = () => {
    if (!gameState.playerName.trim()) {
      handleError('Por favor ingresa un nombre');
      return;
    }

    if (gameState.selectedRole === 'master') {
      const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      setGameState(prev => ({
        ...prev,
        roomCode: newRoomCode,
        phase: 'waiting-room',
        error: null
      }));
    } else {
      setGameState(prev => ({
        ...prev,
        phase: 'room-selection',
        error: null
      }));
    }
  };

  const handleJoinRoom = () => {
    if (!gameState.roomCode.trim()) {
      handleError('Por favor ingresa un código de sala');
      return;
    }
    setGameState(prev => ({
      ...prev,
      phase: 'waiting-room',
      error: null
    }));
  };

  const handleStartGame = ({ difficulty }) => {
    setGameState(prev => ({
      ...prev,
      difficulty: difficulty || prev.difficulty,
      phase: 'game',
      error: null
    }));
  };

  const handleReset = () => {
    setGameState({
      phase: 'role-selection',
      selectedRole: null,
      playerName: '',
      roomCode: '',
      difficulty: 'principiante',
      error: null
    });
  };

  const renderNameInput = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="p-8 bg-black/40 shadow-2xl backdrop-blur-sm border border-white/10">
        <h2 className="text-2xl font-bold text-center text-white mb-6">
          {gameState.selectedRole === 'master' ? 'Crear sala' : 'Unirse a sala'}
        </h2>
        <Input
          type="text"
          placeholder="Tu nombre"
          value={gameState.playerName}
          onChange={(e) => setGameState(prev => ({
            ...prev,
            playerName: e.target.value,
            error: null
          }))}
          className="w-full bg-black/30 border-white/20 text-white placeholder:text-white/50 mb-4"
          maxLength={20}
        />
        {gameState.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{gameState.error}</AlertDescription>
          </Alert>
        )}
        <Button
          onClick={handleNameSubmit}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
        >
          Continuar
        </Button>
      </Card>
    </motion.div>
  );

  const renderRoomSelection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="p-8 bg-black/40 shadow-2xl backdrop-blur-sm border border-white/10">
        <h2 className="text-2xl font-bold text-center text-white mb-6">
          Unirse a sala
        </h2>
        <Input
          type="text"
          placeholder="Código de sala"
          value={gameState.roomCode}
          onChange={(e) => setGameState(prev => ({
            ...prev,
            roomCode: e.target.value.toUpperCase(),
            error: null
          }))}
          className="w-full bg-black/30 border-white/20 text-white placeholder:text-white/50 mb-4"
          maxLength={6}
        />
        {gameState.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-white">{gameState.error}</AlertDescription>
          </Alert>
        )}
        <Button
          onClick={handleJoinRoom}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 mt-4"
        >
          Unirse
        </Button>
      </Card>
    </motion.div>
  );

  const renderGameComponent = () => {
    if (gameState.selectedRole === 'master') {
      return (
        <GameMaster
          roomCode={gameState.roomCode}
          difficulty={gameState.difficulty}
          onError={handleConnectionError}
        />
      );
    }
    return (
      <MusicBingoGame
        playerName={gameState.playerName}
        roomCode={gameState.roomCode}
        difficulty={gameState.difficulty}
        onError={handleConnectionError}
        onRoomNotFound={handleRoomNotFound}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#1a0133] p-4 relative overflow-hidden font-audiowide">
      {/* Fondo con cuadrícula tipo disco */}
      <div
        className="absolute inset-0 opacity-20"
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

      {/* Logo y título con efecto neón */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12 relative"
      >
        <h1 className="text-6xl md:text-5xl md:m-3 font-bold mb-4 tracking-wider"
          style={{
            color: '#fff',
            textShadow: `
                  0 0 7px #fff,
                  0 0 10px #fff,
                  0 0 21px #fff,
                  0 0 42px #ff00ee,
                  0 0 82px #ff00ee,
                  0 0 92px #ff00ee
                `
          }}>
          DISCOHITS
        </h1>
        <h2 className="text-4xl md:text-4xl font-bold relative"
          style={{
            background: 'linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b00ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 20px rgba(255,255,255,0.5)'
          }}>
          Music BINGO
        </h2>
      </motion.div>

      {/* Efecto de bola de disco */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        className="absolute top-10 right-10 w-20 h-20 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.8) 10%, rgba(255,255,255,0.3) 60%)',
          boxShadow: '0 0 20px rgba(255,255,255,0.5)'
        }}
      />

      {/* Contenido principal */}
      <div className="w-full min-h-screen flex flex-col items-center justify-center relative z-10">
        {/* Área principal de juego */}
        <AnimatePresence mode="wait">
          {gameState.phase === 'role-selection' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
            >
              <Card className="p-8 bg-black/40 shadow-2xl backdrop-blur-sm border border-white/10">
                <div className="grid gap-6">
                  <Button
                    onClick={() => handleRoleSelect('master')}
                    className="h-auto py-8 bg-black/30 border-2 border-[#00ff00] hover:bg-[#00ff00]/20 transform transition-all hover:scale-105 group text-white/90"
                    style={{
                      boxShadow: '0 0 10px #00ff00, inset 0 0 20px rgba(0, 255, 0, 0.2)',
                    }}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Music className="w-8 h-8 group-hover:animate-spin" />
                      <span className="text-xl font-bold tracking-wide">Game Master</span>
                    </div>
                  </Button>

                  <Button
                    onClick={() => handleRoleSelect('player')}
                    className="h-auto py-8 bg-black/30 border-2 border-[#ff00ee] hover:bg-[#ff00ee]/20 transform transition-all hover:scale-105 group text-white/90"
                    style={{
                      boxShadow: '0 0 10px #ff00ee, inset 0 0 20px rgba(255, 0, 238, 0.2)',
                    }}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Users className="w-8 h-8 group-hover:animate-bounce" />
                      <span className="text-xl font-bold tracking-wide">Jugador</span>
                    </div>
                  </Button>
                </div>

                <p className="text-white/60 text-center mt-6 text-sm">
                  El bingo de las abuelas
                </p>
              </Card>
            </motion.div>
          )}

          {gameState.phase === 'spotify-auth' && (
            <SpotifyAuth
              onSuccess={() => setGameState(prev => ({
                ...prev,
                phase: 'name-input',
                error: null
              }))}
            />
          )}

          {gameState.phase === 'name-input' && renderNameInput()}
          {gameState.phase === 'room-selection' && renderRoomSelection()}
          {gameState.phase === 'waiting-room' && (
            <GameRoom
              roomCode={gameState.roomCode}
              playerName={gameState.playerName}
              isHost={gameState.selectedRole === 'master'}
              onStartGame={handleStartGame}
              onError={handleConnectionError}
              onRoomNotFound={handleRoomNotFound}
            />
          )}
          {gameState.phase === 'game' && renderGameComponent()}
        </AnimatePresence>
      </div>

      {/* Botón de retorno */}
      {gameState.phase !== 'role-selection' && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          onClick={handleReset}
          className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 bg-black/30 text-white rounded-full p-2 sm:p-3 shadow-lg hover:bg-white/10 transition-colors duration-300 z-50 backdrop-blur-sm"
        >
          <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </motion.button>
      )}
    </div>
  );
}

export default App;