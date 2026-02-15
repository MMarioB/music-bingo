import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from "react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import { AlertCircle, ArrowLeft, Music, Users } from "lucide-react";

// Lazy load de componentes pesados (solo se cargan cuando se necesitan)
const GameMaster = lazy(() => import("../components/GameMasterView/GameMaster"));
const MusicBingoGame = lazy(() => import("../components/PlayerView/MusicBingoGame"));
const SpotifyAuth = lazy(() => import("../components/Auth/SpotifyAuth"));
const GameRoom = lazy(() => import("../components/GameRoom"));

// Estilos estáticos extraídos fuera del componente
const gridBgStyle = {
  backgroundImage: `
    linear-gradient(to right, #ff00ee 1px, transparent 1px),
    linear-gradient(to bottom, #ff00ee 1px, transparent 1px)
  `,
  backgroundSize: '40px 40px',
  transform: 'perspective(500px) rotateX(60deg)',
  transformOrigin: 'bottom'
};

const discoBallStyle = {
  background: 'radial-gradient(circle, rgba(255,255,255,0.8) 10%, rgba(255,255,255,0.3) 60%)',
  boxShadow: '0 0 20px rgba(255,255,255,0.5)',
  opacity: 0.6
};

const neonTitleStyle = {
  color: '#fff',
  textShadow: `
      0 0 7px #fff,
      0 0 10px #fff,
      0 0 21px #fff,
      0 0 42px #ff00ee,
      0 0 82px #ff00ee,
      0 0 92px #ff00ee
    `
};

const rainbowTextStyle = {
  background: 'linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b00ff)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  textShadow: '0 0 20px rgba(255,255,255,0.5)'
};

const gameMasterBtnStyle = { boxShadow: '0 0 10px #00ff00, inset 0 0 20px rgba(0, 255, 0, 0.2)' };
const playerBtnStyle = { boxShadow: '0 0 10px #ff00ee, inset 0 0 20px rgba(255, 0, 238, 0.2)' };

// Spinner de carga para Suspense
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  const [gameState, setGameState] = useState({
    phase: 'role-selection',
    selectedRole: null,
    playerName: '',
    roomCode: '',
    difficulty: 'principiante',
    error: null
  });

  // Detectar código de sala en URL al cargar
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');

    if (roomFromUrl) {
      console.log('🔗 Código de sala detectado en URL:', roomFromUrl);
      setGameState(prev => ({
        ...prev,
        selectedRole: 'player',
        roomCode: roomFromUrl.toUpperCase(),
        phase: 'name-input',
      }));
    }
  }, []);

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

  const handleRoleSelect = useCallback((role) => {
    setGameState(prev => ({
      ...prev,
      selectedRole: role,
      phase: role === 'master' ? 'spotify-auth' : 'name-input',
      error: null
    }));
  }, []);

  const handleNameSubmit = useCallback(() => {
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
  }, [gameState.playerName, gameState.selectedRole, handleError]);

  const handleJoinRoom = useCallback(() => {
    if (!gameState.roomCode.trim()) {
      handleError('Por favor ingresa un código de sala');
      return;
    }
    setGameState(prev => ({
      ...prev,
      phase: 'waiting-room',
      error: null
    }));
  }, [gameState.roomCode, handleError]);

  const handleStartGame = useCallback(({ difficulty }) => {
    setGameState(prev => ({
      ...prev,
      difficulty: difficulty || prev.difficulty,
      phase: 'game',
      error: null
    }));
  }, []);

  const handleReset = useCallback(() => {
    setGameState({
      phase: 'role-selection',
      selectedRole: null,
      playerName: '',
      roomCode: '',
      difficulty: 'principiante',
      error: null
    });
  }, []);

  const handleNameChange = useCallback((e) => {
    setGameState(prev => ({
      ...prev,
      playerName: e.target.value,
      error: null
    }));
  }, []);

  const handleRoomCodeChange = useCallback((e) => {
    setGameState(prev => ({
      ...prev,
      roomCode: e.target.value.toUpperCase(),
      error: null
    }));
  }, []);

  const handleSpotifySuccess = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      phase: 'name-input',
      error: null
    }));
  }, []);

  const showTitle = ['role-selection', 'name-input', 'room-selection'].includes(gameState.phase);

  return (
    <div className="min-h-screen bg-[#1a0133] p-4 relative overflow-hidden font-audiowide">
      {/* Fondo con cuadrícula tipo disco */}
      <div className="absolute inset-0 opacity-20" style={gridBgStyle} />

      {/* Efecto de bola de disco */}
      <div
        className="absolute top-10 right-10 w-20 h-20 rounded-full animate-fadeIn"
        style={discoBallStyle}
      />

      {/* Contenido principal */}
      <div className="w-full min-h-screen flex flex-col items-center justify-center relative z-10">
        {/* Logo y título con efecto neón */}
        {showTitle && (
          <div className="text-center mb-12 relative animate-slideDown">
            <h1 className="text-4xl md:text-5xl md:m-3 font-bold mb-4 tracking-wider"
              style={neonTitleStyle}>
              DISCOHITS
            </h1>
            <h2 className="text-2xl md:text-4xl font-bold relative"
              style={rainbowTextStyle}>
              Music BINGO
            </h2>
          </div>
        )}

        {/* Área principal de juego */}
        <Suspense fallback={<LoadingFallback />}>
          {gameState.phase === 'role-selection' && (
            <div className="w-full max-w-md animate-scaleIn">
              <Card className="p-8 bg-black/40 shadow-2xl backdrop-blur-sm border border-white/10">
                <div className="grid gap-6">
                  <Button
                    onClick={() => handleRoleSelect('master')}
                    className="h-auto py-8 bg-black/30 border-2 border-[#00ff00] hover:bg-[#00ff00]/20 transform transition-all hover:scale-105 group text-white/90"
                    style={gameMasterBtnStyle}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Music className="w-8 h-8 group-hover:animate-spin" />
                      <span className="text-xl font-bold tracking-wide">Game Master</span>
                    </div>
                  </Button>

                  <Button
                    onClick={() => handleRoleSelect('player')}
                    className="h-auto py-8 bg-black/30 border-2 border-[#ff00ee] hover:bg-[#ff00ee]/20 transform transition-all hover:scale-105 group text-white/90"
                    style={playerBtnStyle}
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
            </div>
          )}

          {gameState.phase === 'spotify-auth' && (
            <SpotifyAuth onSuccess={handleSpotifySuccess} />
          )}

          {gameState.phase === 'name-input' && (
            <div className="w-full max-w-md mx-auto animate-slideUp">
              <Card className="p-8 bg-black/40 shadow-2xl backdrop-blur-sm border border-white/10">
                <h2 className="text-2xl font-bold text-center text-white mb-6">
                  {gameState.selectedRole === 'master' ? 'Crear sala' : 'Unirse a sala'}
                </h2>
                {gameState.selectedRole === 'player' && gameState.roomCode && (
                  <div className="mb-4 p-3 bg-purple-500/20 border border-purple-400/50 rounded-lg text-center">
                    <p className="text-purple-200 text-sm mb-1">Sala detectada</p>
                    <p className="text-purple-300 font-bold text-xl tracking-wider">{gameState.roomCode}</p>
                  </div>
                )}
                <Input
                  type="text"
                  placeholder="Tu nombre"
                  value={gameState.playerName}
                  onChange={handleNameChange}
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
            </div>
          )}

          {gameState.phase === 'room-selection' && (
            <div className="w-full max-w-md mx-auto animate-slideUp">
              <Card className="p-8 bg-black/40 shadow-2xl backdrop-blur-sm border border-white/10">
                <h2 className="text-2xl font-bold text-center text-white mb-6">
                  Unirse a sala
                </h2>
                <Input
                  type="text"
                  placeholder="Código de sala"
                  value={gameState.roomCode}
                  onChange={handleRoomCodeChange}
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
            </div>
          )}

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

          {gameState.phase === 'game' && (
            gameState.selectedRole === 'master' ? (
              <GameMaster
                roomCode={gameState.roomCode}
                difficulty={gameState.difficulty}
                onError={handleConnectionError}
              />
            ) : (
              <MusicBingoGame
                playerName={gameState.playerName}
                roomCode={gameState.roomCode}
                difficulty={gameState.difficulty}
                onError={handleConnectionError}
                onRoomNotFound={handleRoomNotFound}
              />
            )
          )}
        </Suspense>
      </div>

      {/* Botón de retorno */}
      {gameState.phase !== 'role-selection' && (
        <button
          onClick={handleReset}
          className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 bg-black/30 text-white rounded-full p-2 sm:p-3 shadow-lg hover:bg-white/10 transition-colors duration-300 z-50 backdrop-blur-sm animate-slideRight"
        >
          <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.4s ease-out forwards; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp { animation: slideUp 0.4s ease-out forwards; }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scaleIn { animation: scaleIn 0.3s ease-out forwards; }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slideRight { animation: slideRight 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}

export default App;
