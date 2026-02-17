import React, { useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { ExternalLinkIcon, MusicIcon, CalendarIcon, RefreshCwIcon, AlertCircle, Check, Trophy, Users } from 'lucide-react';
import CategoryWheel from '../Wheel/CategoryWheel';
import PredictionsPanel from './PredictionsPanel';
import RoomQRCode from '../RoomQRCode';
import SongHistory from '../SongHistory';
import GameLayout from '../GameLayout';
import SongTimer from './SongTimer';
import AudioPlayer from '../AudioPlayer';
import BingoBoard from '../PlayerView/BingoBoard';
import PlayerPredictions from '../PlayerView/PlayerPredictions';
import PropTypes from 'prop-types';
import { useGameMasterLogic } from './GameMasterLogic';
import { MUSIC_CATEGORIES } from './constants';

// Estilos estáticos
const categoryBoxShadow = { boxShadow: '0 0 15px rgba(255,255,255,0.1)' };
const generateBtnShadow = { boxShadow: '0 0 15px rgba(168,85,247,0.3)' };
const spotifyBtnShadow = { boxShadow: '0 0 20px rgba(34,197,94,0.4)' };
const revealBtnShadow = { boxShadow: '0 0 20px rgba(168,85,247,0.5)' };

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
    setConnectionError,
    timerDuration,
    timerRunning,
    timerPaused,
    timeRemaining,
    pauseTimer,
    resumeTimer,
    addTime,
    selectedMusicTheme,
    setSelectedMusicTheme,
    gmBoard,
    handleGMCellClick,
    gmHasMarkedInCurrentRound,
    gmPredictions,
    handleGMPrediction,
    currentController
  } = useGameMasterLogic({ roomCode, initialDifficulty });

  const isControlled = !!currentController;

  useEffect(() => {
    let timer;
    if (connectionError && !serverWaking) {
      timer = setTimeout(() => setConnectionError(null), 5000);
    }
    return () => clearTimeout(timer);
  }, [connectionError, serverWaking, setConnectionError]);

  const renderMainSection = () => (
    <div>
      {/* Banner de controlador activo */}
      {isControlled && (
        <div className="mb-4 bg-cyan-500/20 border border-cyan-500/40 rounded-lg p-3 flex items-center justify-center gap-2 animate-slideUp">
          <span className="text-cyan-300 text-sm font-medium">
            🎮 {currentController.name} controla esta ronda
          </span>
        </div>
      )}

      {gameStep === 'wheel' ? (
        isControlled ? (
          <div className="text-center py-12 text-white/50 animate-slideUp">
            <p className="text-lg">Esperando a que {currentController.name} gire la ruleta...</p>
          </div>
        ) : (
          <div className="flex items-center justify-center animate-scaleIn">
            <CategoryWheel difficulty={difficulty} onCategorySelected={handleCategorySelected} />
          </div>
        )
      ) : (
        <div className="space-y-4 animate-slideUp">
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
              style={categoryBoxShadow}
            >
              <div className="flex items-center gap-2">
                {selectedCategory.icon && <selectedCategory.icon size={24} className="text-gray-800" />}
                <span className="text-base font-medium text-gray-800">{selectedCategory.name}</span>
              </div>
            </div>
          )}

          {/* Selector de tema musical (solo si host controla) */}
          {!isControlled && !currentCard && selectedCategory && (
            <Card className="bg-black/30 border border-white/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <MusicIcon className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Tema Musical</h3>
              </div>
              <RadioGroup
                value={selectedMusicTheme}
                onValueChange={setSelectedMusicTheme}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="auto" id="theme-auto" className="border-purple-400 text-purple-400" />
                  <Label htmlFor="theme-auto" className="text-white/80 text-sm cursor-pointer">
                    🎲 Aleatorio
                  </Label>
                </div>
                {MUSIC_CATEGORIES.map((theme) => (
                  <div key={theme} className="flex items-center space-x-2">
                    <RadioGroupItem value={theme} id={`theme-${theme}`} className="border-purple-400 text-purple-400" />
                    <Label htmlFor={`theme-${theme}`} className="text-white/80 text-sm cursor-pointer">
                      {theme === 'tradicional' && '🎼 Tradicional'}
                      {theme === 'rockEspanol' && '🎸 Rock Español'}
                      {theme === 'popNacional' && '🎤 Pop Nacional'}
                      {theme === 'popRockIndie' && '🎧 Pop/Rock/Indie'}
                      {theme === 'musicaUrbana' && '🔥 Música Urbana'}
                      {theme === 'internacional' && '🌍 Internacional'}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </Card>
          )}

          {/* Timer */}
          {currentCard && !currentCard.revealed && timerRunning && (
            <SongTimer
              duration={timerDuration}
              isRunning={timerRunning}
              isPaused={timerPaused}
              timeRemaining={timeRemaining}
              predictionsCount={Object.keys(playerPredictions).length}
              totalPlayers={connectedPlayers.filter(p => !p.isHost).length}
              spotifyUrl={currentCard.spotifyUrl}
              onPause={pauseTimer}
              onResume={resumeTimer}
              onAddTime={() => addTime(15)}
              onRevealNow={handleRevealSong}
            />
          )}

          {/* Spotify embed con overlay - reproduce audio pero oculta info de la canción */}
          {currentCard && !currentCard.revealed && (
            <div className="relative rounded-lg overflow-hidden">
              <AudioPlayer
                spotifyUrl={currentCard.spotifyUrl}
                compact={true}
              />
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center"
                style={{ pointerEvents: 'none' }}
              >
                <span className="text-white/50 text-sm font-medium tracking-wide">Pulsa play para escuchar</span>
              </div>
            </div>
          )}

          {/* Tarjeta de canción o botón generar */}
          {!currentCard ? (
            isControlled ? (
              <div className="text-center py-6 text-white/40 text-sm">
                {isLoading ? 'Generando tarjeta...' : `Esperando a ${currentController.name}...`}
              </div>
            ) : (
              <Button
                onClick={generateNewCard}
                disabled={isLoading || !selectedCategory}
                className="w-full h-12 bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-600 hover:to-indigo-600 border border-purple-400/50 text-base font-medium"
                style={generateBtnShadow}
              >
                {isLoading ? 'Generando...' : selectedCategory ? 'Generar Tarjeta' : 'Selecciona una categoría primero'}
              </Button>
            )
          ) : (
            <Card className="bg-black/30 border border-white/20 overflow-hidden">
              {currentCard.albumImage && (
                <div className={`relative transition-all duration-500 ${currentCard.revealed ? '' : 'blur-md grayscale'}`}>
                  <img
                    src={currentCard.albumImage}
                    alt={`${currentCard.title} - ${currentCard.artist}`}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {currentCard.revealed && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 animate-slideUp">
                      <h2 className="text-xl font-bold text-white drop-shadow-lg mb-1">
                        {currentCard.title}
                      </h2>
                      <div className="flex items-center text-purple-200 drop-shadow-lg">
                        <MusicIcon className="w-4 h-4 mr-2" />
                        <span className="text-base">{currentCard.artist}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-4 space-y-3">
                {(!currentCard.albumImage || !currentCard.revealed) && (
                  <div className={`transition-all duration-500 ${currentCard.revealed ? '' : 'blur-md'}`}>
                    <div className="text-center mb-3">
                      <h2 className="text-xl font-bold text-white">{currentCard.title}</h2>
                      <div className="flex justify-center items-center space-x-2 text-purple-300">
                        <MusicIcon className="w-4 h-4" />
                        <span className="text-base">{currentCard.artist}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className={`grid grid-cols-2 gap-2 transition-all duration-500 ${currentCard.revealed ? '' : 'blur-md select-none'}`}>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 flex items-center justify-between">
                    <CalendarIcon className="w-4 h-4 text-purple-400" />
                    <span className="text-lg font-bold text-white">{currentCard.year}</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 flex items-center justify-between">
                    <MusicIcon className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-purple-300 truncate">{currentCard.musicCategory}</span>
                  </div>
                </div>

                {!currentCard.revealed ? (
                  !isControlled && (
                    <div className="space-y-2">
                      <Button
                        onClick={handleRevealSong}
                        className="w-full h-11 bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-600 hover:to-indigo-600 border border-purple-400/50 text-base font-semibold"
                        style={generateBtnShadow}
                      >
                        <ExternalLinkIcon className="mr-2 h-5 w-5" />
                        Revelar Canción
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    {currentCard.spotifyUrl && (
                      <Button
                        className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-base border-2 border-green-400/50 shadow-lg"
                        onClick={() => window.open(currentCard.spotifyUrl, '_blank')}
                        style={spotifyBtnShadow}
                      >
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                        Abrir en Spotify
                      </Button>
                    )}

                    {!isControlled && (
                      <>
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
                      </>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );

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
                {!isControlled && currentCard?.revealed && !isMarkingEnabled && (
                  <div
                    onClick={() => handlePlayerCorrectToggle(player.id)}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer flex-shrink-0 transition-all ${
                      playerCorrectStatus[player.id]
                        ? 'bg-green-500 border-green-500'
                        : 'border-white/50 hover:border-white hover:bg-white/10'
                    }`}
                  >
                    {playerCorrectStatus[player.id] && (
                      <div className="animate-scaleIn">
                        <Check className="w-4 h-4 text-white" />
                      </div>
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
        <div className="lg:col-span-2 space-y-4">
          {renderMainSection()}

          {/* Tablero del GM */}
          {gmBoard.length > 0 && (
            <div className="animate-slideUp">
              <h3 className="text-sm font-semibold text-white/60 mb-2 text-center">Tu Tablero</h3>
              <BingoBoard
                board={gmBoard}
                canMark={(() => {
                  if (!isMarkingEnabled) return false;
                  const gmPlayer = connectedPlayers.find(p => p.isHost);
                  return gmPlayer ? !!playerCorrectStatus[gmPlayer.id] : false;
                })()}
                currentCategory={selectedCategory}
                currentSong={currentCard}
                onCellClick={handleGMCellClick}
              />
            </div>
          )}

          {/* Predicciones del GM */}
          <PlayerPredictions
            gameState={{
              songPlaying: !!currentCard && !currentCard?.revealed,
              currentSong: currentCard
            }}
            myPredictions={gmPredictions}
            onSubmitPrediction={handleGMPrediction}
          />
        </div>
        <div className="lg:col-span-1">
          {renderPlayersSection()}
        </div>
      </div>

      {/* Componentes flotantes */}
      <RoomQRCode roomCode={roomCode} />
      <SongHistory songs={songHistory} />
      <PredictionsPanel predictions={playerPredictions} />

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scaleIn { animation: scaleIn 0.3s ease-out forwards; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }
      `}</style>
    </GameLayout>
  );
};

GameMaster.propTypes = {
  roomCode: PropTypes.string.isRequired,
  difficulty: PropTypes.oneOf(['principiante', 'experto']).isRequired
};

export default React.memo(GameMaster);
