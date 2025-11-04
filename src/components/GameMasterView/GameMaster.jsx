import { useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLinkIcon, MusicIcon, CalendarIcon, RefreshCwIcon, AlertCircle, Check, Trophy, Users } from 'lucide-react';
import CategoryWheel from '../Wheel/CategoryWheel';
import PredictionsPanel from './PredictionsPanel';
import RoomQRCode from '../RoomQRCode';
import SongHistory from '../SongHistory';
import GameLayout from '../GameLayout';
import PropTypes from 'prop-types';
import { useGameMasterLogic } from './GameMasterLogic';

const GameMaster = ({ roomCode, difficulty: initialDifficulty }) => {
  const {
    currentCard,
    isLoading,
    selectedCategory,
    gameStep,
    connectedPlayers,
    difficulty,
    connectionError,
    tokenWarning,
    serverWaking,
    songHistory,
    isMarkingEnabled,
    playerPredictions,
    handlePlayerCorrectToggle,
    handleCategorySelected,
    generateNewCard,
    handleRevealSong,
    handleMarkingToggle,
    startNewRound,
    playerCorrectStatus,
    winners,
    gameOver,
    finishGame,
    setConnectionError
  } = useGameMasterLogic({ roomCode, initialDifficulty });

  useEffect(() => {
    let timer;
    // No auto-limpiar el error si el servidor está despertando
    if (connectionError && !serverWaking) {
      timer = setTimeout(() => setConnectionError(null), 5000);
    }
    return () => clearTimeout(timer);
  }, [connectionError, serverWaking, setConnectionError]);

  // Renderizar la sección principal (ruleta o tarjeta)
  const renderMainSection = () => (
    <AnimatePresence mode="wait">
      {gameStep === 'wheel' ? (
        <motion.div
          key="wheel"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="flex items-center justify-center"
        >
          <CategoryWheel difficulty={difficulty} onCategorySelected={handleCategorySelected} />
        </motion.div>
      ) : (
        <motion.div
          key="card-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-4"
        >
          {/* Alerta de ganadores */}
          {winners.length > 0 && !gameOver && (
            <Alert className="bg-purple-500/20 border-purple-500/50">
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-white flex items-center">
                    <Trophy className="h-5 w-5 text-yellow-400 mr-2" />
                    {winners.length > 1 ? '¡Hay varios ganadores!' : '¡Tenemos un ganador!'}
                  </h3>
                  <Button onClick={finishGame} className="bg-purple-600 hover:bg-purple-700 text-white text-sm">
                    Finalizar Juego
                  </Button>
                </div>
                <div className="space-y-1">
                  {winners.map(winner => (
                    <div key={winner.id} className="text-white flex items-center gap-2 bg-purple-500/10 py-1 px-2 rounded">
                      <Trophy className="h-4 w-4 text-yellow-400" />
                      <span>{winner.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Alert>
          )}

          {/* Categoría seleccionada */}
          {selectedCategory && (
            <div
              className={`${selectedCategory.color} p-3 rounded-lg flex items-center justify-center gap-3 border border-white/20`}
              style={{ boxShadow: '0 0 15px rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center gap-2">
                {selectedCategory.icon && <selectedCategory.icon size={24} className="text-gray-800" />}
                <span className="text-base font-medium text-gray-800">{selectedCategory.name}</span>
              </div>
            </div>
          )}

          {/* Tarjeta de canción o botón generar */}
          {!currentCard ? (
            <Button
              onClick={generateNewCard}
              disabled={isLoading || !selectedCategory}
              className="w-full h-12 bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-600 hover:to-indigo-600 border border-purple-400/50 text-base font-medium"
              style={{ boxShadow: '0 0 15px rgba(168,85,247,0.3)' }}
            >
              {isLoading ? 'Generando...' : selectedCategory ? 'Generar Tarjeta' : 'Selecciona una categoría primero'}
            </Button>
          ) : (
            <Card className="bg-black/30 border border-white/20 p-4">
              <div className="space-y-3">
                {/* Información de la canción */}
                <div className={`transition-all duration-500 ${currentCard.revealed ? '' : 'blur-md'}`}>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="col-span-2 text-center">
                      <h2 className="text-xl font-bold text-white">{currentCard.title}</h2>
                      <div className="flex justify-center items-center space-x-2 text-purple-300">
                        <MusicIcon className="w-4 h-4" />
                        <span className="text-base">{currentCard.artist}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 flex items-center justify-between">
                      <CalendarIcon className="w-5 h-5 text-purple-400" />
                      <span className="text-xl font-bold text-white">{currentCard.year}</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 flex items-center justify-between">
                      <MusicIcon className="w-5 h-5 text-purple-400" />
                      <span className="text-sm text-purple-300">{currentCard.musicCategory}</span>
                    </div>
                  </div>
                </div>

                {/* Controles de canción */}
                {!currentCard.revealed ? (
                  <div className="space-y-2">
                    <Button
                      onClick={handleRevealSong}
                      className="w-full h-10 bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-600 hover:to-indigo-600 border border-purple-400/50"
                      style={{ boxShadow: '0 0 15px rgba(168,85,247,0.3)' }}
                    >
                      <ExternalLinkIcon className="mr-2 h-4 w-4" />
                      Revelar Canción
                    </Button>
                    {currentCard.spotifyUrl && (
                      <Button
                        variant="outline"
                        className="w-full h-10 border-purple-400/50 text-purple-300 hover:bg-purple-500/20"
                        onClick={() => window.open(currentCard.spotifyUrl, '_blank')}
                      >
                        <ExternalLinkIcon className="mr-2 h-4 w-4" />
                        Abrir en Spotify
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={handleMarkingToggle}
                      disabled={!Object.values(playerCorrectStatus || {}).some(correct => correct) && !isMarkingEnabled}
                      className={`w-full h-10 transition-all duration-300 ${
                        isMarkingEnabled
                          ? 'bg-yellow-500/80 hover:bg-yellow-500 border-yellow-400'
                          : Object.values(playerCorrectStatus || {}).some(correct => correct)
                            ? 'bg-green-500/80 hover:bg-green-500 border-green-400'
                            : 'bg-gray-500/50 border-gray-400 cursor-not-allowed'
                      } border`}
                    >
                      {isMarkingEnabled
                        ? 'Deshabilitar Marcado'
                        : Object.values(playerCorrectStatus || {}).some(correct => correct)
                          ? 'Habilitar Marcado para Acertantes'
                          : 'Marca al menos un acertante'}
                    </Button>
                    <Button
                      onClick={startNewRound}
                      variant="outline"
                      className="w-full h-10 border-white/20 text-white/80 hover:bg-white/10"
                    >
                      <RefreshCwIcon className="w-4 h-4 mr-2" />
                      Nueva Ronda
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Renderizar la sección de jugadores (sidebar)
  const renderPlayersSection = () => (
    <div className="bg-black/30 border border-white/20 rounded-lg p-4 h-fit lg:sticky lg:top-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          Jugadores ({connectedPlayers.length})
        </h3>
        {currentCard?.revealed && (
          <span className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded-full">
            {isMarkingEnabled ? '✓ Marcado habilitado' : 'Marca acertantes'}
          </span>
        )}
      </div>

      {connectedPlayers.length > 0 ? (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
          {connectedPlayers.map((player) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                playerCorrectStatus[player.id]
                  ? 'bg-green-500/20 border-green-500/30'
                  : winners.some(w => w.id === player.id)
                    ? 'bg-purple-500/20 border-purple-500/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {currentCard?.revealed && !isMarkingEnabled && !player.isHost && (
                  <div
                    onClick={() => handlePlayerCorrectToggle(player.id)}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer flex-shrink-0 transition-all ${
                      playerCorrectStatus[player.id]
                        ? 'bg-green-500 border-green-500'
                        : 'border-white/50 hover:border-white hover:bg-white/10'
                    }`}
                  >
                    {playerCorrectStatus[player.id] && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </div>
                )}
                <span className="font-medium text-white truncate">{player.name}</span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {winners.some(w => w.id === player.id) && (
                  <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-1 rounded-full border border-purple-400/50 flex items-center gap-1">
                    <Trophy className="h-3 w-3" />
                    Ganador
                  </span>
                )}
                {playerCorrectStatus[player.id] && !winners.some(w => w.id === player.id) && (
                  <span className="text-xs bg-green-500/30 text-green-300 px-2 py-1 rounded-full">
                    ¡Acierto!
                  </span>
                )}
                {player.isHost && (
                  <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-1 rounded-full border border-purple-400/50">
                    GM
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-white/60">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Esperando jugadores...</p>
        </div>
      )}
    </div>
  );

  return (
    <GameLayout roomCode={roomCode} playersCount={connectedPlayers.length}>
      {/* Alertas globales */}
      <div className="space-y-3 mb-4">
        {serverWaking && connectionError ? (
          <Alert className="bg-cyan-500/20 border border-cyan-500/50">
            <AlertCircle className="h-4 w-4 text-cyan-300" />
            <AlertDescription className="text-cyan-200">{connectionError}</AlertDescription>
          </Alert>
        ) : connectionError ? (
          <Alert variant="destructive" className="bg-red-500/20 border border-red-500/50">
            <AlertCircle className="h-4 w-4 text-white" />
            <AlertDescription className="text-white">{connectionError}</AlertDescription>
          </Alert>
        ) : null}

        {tokenWarning && (
          <Alert className="bg-yellow-500/20 border border-yellow-500/50">
            <AlertCircle className="h-4 w-4 text-yellow-300" />
            <AlertDescription className="text-yellow-200">{tokenWarning}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Modal de juego finalizado */}
      {gameOver && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-black/90 border border-purple-500/50 rounded-lg p-6 max-w-lg w-full mx-4">
            <h2 className="text-2xl font-bold text-white text-center mb-6 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-yellow-400 mr-3" />
              ¡Juego Finalizado!
            </h2>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                {winners.length > 1 ? 'Ganadores:' : 'Ganador:'}
              </h3>
              <div className="space-y-2">
                {winners.map(winner => (
                  <div key={winner.id} className="bg-purple-500/20 border border-purple-500/50 rounded-lg p-3 flex items-center">
                    <Trophy className="h-5 w-5 text-yellow-400 mr-2" />
                    <span className="text-white font-medium">{winner.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={startNewRound} className="w-full bg-green-600 hover:bg-green-700 text-white py-3">
              Iniciar Nuevo Juego
            </Button>
          </div>
        </div>
      )}

      {/* Layout principal de dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal - Ruleta/Tarjeta */}
        <div className="lg:col-span-2">
          {renderMainSection()}
        </div>

        {/* Sidebar - Jugadores */}
        <div className="lg:col-span-1">
          {renderPlayersSection()}
        </div>
      </div>

      {/* Componentes flotantes */}
      <RoomQRCode roomCode={roomCode} />
      <SongHistory songs={songHistory} />
      <PredictionsPanel predictions={playerPredictions} />
    </GameLayout>
  );
};

GameMaster.propTypes = { 
  roomCode: PropTypes.string.isRequired, 
  difficulty: PropTypes.oneOf(['principiante', 'experto']).isRequired 
};

// Aseguramos la exportación por defecto
export default GameMaster;