import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, InfoIcon, Check, XCircleIcon, Trophy } from 'lucide-react';
import PropTypes from 'prop-types';
import { useMusicBingoLogic } from './MusicBingoGameLogic';
import PlayerPredictions from '../PlayerView/PlayerPredictions';
import GameLayout from '../GameLayout';

const MusicBingoGame = ({ playerName, roomCode, difficulty }) => {
  const [lastMarkedIndex, setLastMarkedIndex] = useState(null);
  const [hasMarkedThisRound, setHasMarkedThisRound] = useState(false);

  const {
    board,
    connectedPlayers,
    currentCategory,
    currentSong,
    canMark,
    hasWinner,
    connectionError,
    predictions,
    songStarted,
    setConnectionError,
    handleCellClick,
    handlePrediction,
    gamePhase,
    isEligibleToMark,
    predictionTimeRemaining,
    canPredict,
    isMarkedAsIncorrect,
    gameOver,
    winners
  } = useMusicBingoLogic({ playerName, roomCode, difficulty });

  const handleMarkCell = (index) => {
    if (!canMark) return;

    if (lastMarkedIndex === index) {
      handleCellClick(index, true);
      setLastMarkedIndex(null);
      setHasMarkedThisRound(false);
    } else if (lastMarkedIndex !== null) {
      handleCellClick(lastMarkedIndex, true);
      handleCellClick(index);
      setLastMarkedIndex(index);
    } else if (!hasMarkedThisRound) {
      handleCellClick(index);
      setLastMarkedIndex(index);
      setHasMarkedThisRound(true);
    }
  };

  useEffect(() => {
    setLastMarkedIndex(null);
    setHasMarkedThisRound(false);
  }, [currentCategory]);

  useEffect(() => {
    let timer;
    if (connectionError) {
      timer = setTimeout(() => {
        setConnectionError(null);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [connectionError, setConnectionError]);

  const renderContent = () => (
    <div className="flex flex-col flex-1 space-y-4">
      {connectionError && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert variant="destructive" className="bg-red-500/20 border border-red-500/50">
              <AlertCircle className="h-4 w-4 text-white" />
              <AlertDescription className="text-white">{connectionError}</AlertDescription>
            </Alert>
          </motion.div>
        </AnimatePresence>
      )}

      <AnimatePresence>
        {hasWinner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert className="bg-green-500/20 border border-green-500/50">
              <Check className="h-5 w-5 text-green-400 mr-2" />
              <AlertDescription className="text-green-300 font-semibold text-sm md:text-base">
                ¡BINGO! ¡Has completado una línea!
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {currentCategory && (
        <div
          className={`${currentCategory.color} p-3 rounded-lg text-center border border-white/20`}
          style={{ boxShadow: '0 0 15px rgba(255,255,255,0.1)' }}
        >
          <h3 className="font-semibold text-lg text-gray-800">{currentCategory.name}</h3>
        </div>
      )}

      {currentSong && isMarkedAsIncorrect && (
        <Alert className="bg-red-500/20 border border-red-500/50">
          <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
          <AlertDescription className="text-red-300">
            Has sido marcado como no acertante en esta ronda. No podrás marcar casillas.
          </AlertDescription>
        </Alert>
      )}

      {currentSong && !isMarkedAsIncorrect && !canMark && !isEligibleToMark && (
        <Alert className="bg-yellow-500/20 border border-yellow-400/50">
          <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
          <AlertDescription className="text-yellow-300">
            Espera a que el Game Master evalúe tu predicción.
          </AlertDescription>
        </Alert>
      )}

      {/* Mensaje cuando se agota el tiempo para predecir (solo si no hay predicciones) */}
      {songStarted && predictionTimeRemaining === 0 && predictions.length === 0 && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert className="bg-red-500/20 border border-red-500/50">
              <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
              <AlertDescription className="text-red-300">
                ¡Se ha agotado el tiempo para hacer predicciones!
              </AlertDescription>
            </Alert>
          </motion.div>
        </AnimatePresence>
      )}

      {currentCategory && (
        <Alert className={
          canMark
            ? "bg-green-500/20 border border-green-400/50"
            : isEligibleToMark
              ? "bg-yellow-500/20 border border-yellow-400/50"
              : isMarkedAsIncorrect
                ? "bg-red-500/20 border border-red-500/50"
                : "bg-blue-500/20 border border-blue-400/50"
        }>
          {canMark ? (
            lastMarkedIndex !== null ? (
              <>
                <InfoIcon className="h-5 w-5 text-blue-400 mr-2" />
                <AlertDescription className="text-blue-300">
                  Puedes desmarcar la casilla seleccionada para elegir otra
                </AlertDescription>
              </>
            ) : (
              <>
                <Check className="h-5 w-5 text-green-400 mr-2" />
                <AlertDescription className="text-green-300">
                  ¡Puedes marcar una casilla de &quot;{currentCategory.name}&quot; ahora!
                </AlertDescription>
              </>
            )
          ) : isEligibleToMark ? (
            <>
              <InfoIcon className="h-5 w-5 text-yellow-400 mr-2" />
              <AlertDescription className="text-yellow-300">
                Espera a que el Game Master habilite el marcado
              </AlertDescription>
            </>
          ) : isMarkedAsIncorrect ? (
            <>
              <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
              <AlertDescription className="text-red-300">
                No has acertado esta ronda, no podrás marcar casillas
              </AlertDescription>
            </>
          ) : (
            <>
              <InfoIcon className="h-5 w-5 text-blue-400 mr-2" />
              <AlertDescription className="text-blue-300">
                {currentSong
                  ? 'Espera a ver si has acertado'
                  : 'Espera a que el Game Master revele la canción'}
              </AlertDescription>
            </>
          )}
        </Alert>
      )}

      {(gamePhase === 'playing' || currentCategory) && (
        <div className="flex-1 flex flex-col justify-center">
          <Card className="bg-black/30 border border-white/20 p-2 md:p-4">
            <div className="grid grid-cols-5 gap-1 md:gap-3">
              {board.map((category, index) => {
                const isSelected = index === lastMarkedIndex;
                const isMarkable = canMark &&
                  category.name === currentCategory?.name &&
                  (!hasMarkedThisRound || isSelected);

                return (
                  <motion.button
                    key={index}
                    whileHover={{ scale: isMarkable ? 1.05 : 1 }}
                    whileTap={{ scale: isMarkable ? 0.95 : 1 }}
                    className={`
                      ${category.color} 
                      aspect-square 
                      rounded-lg
                      flex 
                      items-center 
                      justify-center 
                      p-1 md:p-2
                      text-center 
                      relative 
                      transition-all 
                      duration-200
                      border border-white/20
                      ${isMarkable ? 'cursor-pointer hover:ring-2 hover:ring-purple-400' : 'cursor-default'}
                      ${category.marked ? 'scale-95 shadow-inner' : 'shadow hover:shadow-md'}
                      ${isSelected ? 'ring-2 ring-purple-400' : ''}
                    `}
                    style={isSelected ? { boxShadow: '0 0 15px rgba(168,85,247,0.4)' } : {}}
                    onClick={() => handleMarkCell(index)}
                    disabled={!isMarkable}
                    aria-label={`Casilla ${category.name}`}
                  >
                    {category.marked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg">
                        <Check className="text-green-400 w-6 md:w-10 h-6 md:h-10"
                          style={{ filter: 'drop-shadow(0 0 8px rgb(74 222 128 / 0.5))' }}
                        />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      <PlayerPredictions
        isRevealed={!!currentSong}
        onSubmitPrediction={handlePrediction}
        predictions={predictions}
        currentSongStarted={songStarted}
        disabled={!canPredict}
        timeRemaining={predictionTimeRemaining > 0 ? predictionTimeRemaining : null}
      />
    </div>
  );

  return (
    <GameLayout
      roomCode={roomCode}
      playersCount={connectedPlayers.length}
      showSelect={false}
    >
      {/* Game Over Overlay */}
      {gameOver && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-black/90 border border-purple-500/50 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white text-center mb-6 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-yellow-400 mr-3" />
              ¡Juego Finalizado!
            </h2>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                {winners.length > 1 ? 'Los ganadores son:' : 'El ganador es:'}
              </h3>
              <div className="space-y-2">
                {winners.map(winner => (
                  <div
                    key={winner.id}
                    className={`rounded-lg p-3 flex items-center ${winner.name === playerName
                        ? 'border-yellow-400 bg-yellow-500/20 border'
                        : 'border-purple-500/50 bg-purple-500/20 border'
                      }`}
                  >
                    <Trophy className="h-5 w-5 text-yellow-400 mr-2" />
                    <span className="text-white font-medium">
                      {winner.name}
                      {winner.name === playerName && ' (Tú)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-white/70 text-center">
              Espera a que el Game Master inicie un nuevo juego...
            </p>
          </div>
        </div>
      )}

      {renderContent()}
    </GameLayout>
  );
};

MusicBingoGame.propTypes = {
  playerName: PropTypes.string.isRequired,
  roomCode: PropTypes.string.isRequired,
  difficulty: PropTypes.oneOf(['principiante', 'experto']).isRequired
};

export default MusicBingoGame;