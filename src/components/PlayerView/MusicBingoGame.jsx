import { Card } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  AlertCircle,
  Users,
  InfoIcon
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useMusicBingoLogic } from './MusicBingoGameLogic';

const MusicBingoGame = ({ playerName, roomCode, difficulty }) => {
  const {
    board,
    connectedPlayers,
    currentCategory,
    canMark,
    hasWinner,
    connectionError,
    handleCellClick
  } = useMusicBingoLogic({ playerName, roomCode, difficulty });

  const handleMarkCell = (index) => {
    if (!canMark || board[index].marked) return;

    // Llama a la lógica original
    handleCellClick(index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-3 md:p-6 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl bg-white/80 backdrop-blur-lg rounded-xl shadow-xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 md:p-6">
          <h1 className="text-xl md:text-3xl font-bold text-center text-white drop-shadow-md">
            Music Bingo
          </h1>
        </div>

        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Error de conexión */}
          {connectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
          )}

          {/* Header con información */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">{playerName}</h2>
              <p className="text-sm text-gray-500">
                Sala: {roomCode} - {connectedPlayers.length} jugadores
              </p>
            </div>
          </div>

          {/* Mensaje de victoria */}
          <AnimatePresence>
            {hasWinner && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Alert className="bg-green-100 border-green-300">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                  <AlertDescription className="text-green-800 font-semibold text-sm md:text-base">
                    ¡BINGO! ¡Has completado una línea!
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Información de la ronda actual */}
          {currentCategory && (
            <div className={`${currentCategory.color} p-4 rounded-lg text-center`}>
              <h3 className="font-semibold text-lg">{currentCategory.name}</h3>
            </div>
          )}

          {/* Estado de marcado */}
          {currentCategory && (
            <Alert className={canMark ? "bg-green-100" : "bg-blue-100"}>
              {canMark ? (
                <>
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                  <AlertDescription className="text-green-800">
                    ¡Puedes marcar una casilla de &quot;{currentCategory.name}&quot; ahora!
                  </AlertDescription>
                </>
              ) : (
                <>
                  <InfoIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <AlertDescription className="text-blue-800">
                    Espera a que el Game Master habilite el marcado
                  </AlertDescription>
                </>
              )}
            </Alert>
          )}

          {/* Tablero */}
          <Card className="p-2 md:p-4 shadow-lg">
            <div className="grid grid-cols-5 gap-1 md:gap-3">
              {board.map((category, index) => {
                const Icon = category.icon;
                const isMarkable = canMark && 
                                 category.name === currentCategory?.name &&
                                 !category.marked;

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
                      ${isMarkable ? 'cursor-pointer hover:ring-2 hover:ring-purple-400' : 'cursor-default'}
                      ${category.marked ? 'scale-95 shadow-inner' : 'shadow hover:shadow-md'}
                    `}
                    onClick={() => handleMarkCell(index)}
                    disabled={!isMarkable}
                    aria-label={`Casilla ${category.name}`}
                  >
                    <Icon {...category.iconProps} />
                    {category.marked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                        <CheckCircleIcon className="text-green-500 w-6 md:w-10 h-6 md:h-10" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </Card>

          {/* Lista de jugadores conectados */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base md:text-lg font-semibold">
                Jugadores Conectados
              </h3>
              <div className="flex items-center gap-2 text-gray-600 bg-white/50 px-3 py-1 rounded-full">
                <Users className="w-4 h-4" />
                <span>{connectedPlayers.length}</span>
              </div>
            </div>
            <div className="bg-white/50 rounded-lg divide-y divide-gray-200">
              {connectedPlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2"
                >
                  <span className="font-medium">
                    {player.name}
                    {player.isHost && " (Game Master)"}
                  </span>
                  {player.name === playerName && (
                    <span className="text-xs text-purple-600 font-medium">(Tú)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

MusicBingoGame.propTypes = {
  playerName: PropTypes.string.isRequired,
  roomCode: PropTypes.string.isRequired,
  difficulty: PropTypes.oneOf(['principiante', 'experto']).isRequired
};

export default MusicBingoGame;
