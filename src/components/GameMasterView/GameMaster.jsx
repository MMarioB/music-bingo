import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Alert, AlertDescription } from '../ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLinkIcon,
  MusicIcon,
  CalendarIcon,
  RefreshCwIcon,
  Users,
  AlertCircle
} from 'lucide-react';
import CategoryWheel from '../CategoryWheel';
import PropTypes from 'prop-types';
import { useGameMasterLogic } from './GameMasterLogic';
import { useState, useEffect, useCallback } from 'react';

const GameMaster = ({ roomCode, difficulty: initialDifficulty }) => {
  const [markingEnabledThisRound, setMarkingEnabledThisRound] = useState(false);

  const {
    loggedIn,
    login,
    currentCard,
    isLoading,
    selectedCategory,
    gameStep,
    connectedPlayers,
    difficulty,
    connectionError,
    setConnectionError,
    isMarkingEnabled,
    handleDifficultyChange,
    handleCategorySelected,
    generateNewCard,
    handleRevealSong,
    handleMarkingToggle,
    startNewRound
  } = useGameMasterLogic({ roomCode, initialDifficulty });

  // Efecto para auto-dismiss del error de conexión
  useEffect(() => {
    let timer;
    if (connectionError) {
      timer = setTimeout(() => {
        setConnectionError(null);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [connectionError, setConnectionError]);

  // Manejo del control de marcado
  const handleMarkingControl = useCallback(() => {
    if (!isMarkingEnabled) {
      if (markingEnabledThisRound) {
        console.log('Marcado ya utilizado en esta ronda');
        return;
      }
      console.log('Habilitando marcado por primera vez en esta ronda');
      setMarkingEnabledThisRound(true);
    } else {
      console.log('Deshabilitando marcado');
    }
    handleMarkingToggle();
  }, [isMarkingEnabled, markingEnabledThisRound, handleMarkingToggle]);

  // Manejo de nueva ronda
  const handleNewRound = useCallback(() => {
    console.log('Iniciando nueva ronda');
    setMarkingEnabledThisRound(false);
    startNewRound();
  }, [startNewRound]);

  // Reset de estado cuando cambia la carta
  useEffect(() => {
    if (!currentCard) {
      console.log('Reseteando estado de marcado por nueva carta');
      setMarkingEnabledThisRound(false);
    }
  }, [currentCard]);

  // Renderizado del contenido de la carta
  const renderCardContent = () => {
    if (!currentCard) return null;

    return (
      <div className="space-y-4">
        <div className={`transition-all duration-500 ${currentCard.revealed ? '' : 'blur-md'}`}>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-2">
              {currentCard.title}
            </h2>
            <div className="flex justify-center items-center space-x-2 text-purple-300">
              <MusicIcon className="w-4 h-4" />
              <span className="text-base">{currentCard.artist}</span>
            </div>
          </div>

          <div className="flex justify-between items-center bg-white/10 backdrop-blur-sm rounded-lg p-3 mt-3 border border-white/20">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-purple-400" />
              <span className="text-2xl font-bold text-white">
                {currentCard.year}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <MusicIcon className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-purple-300">
                {currentCard.musicCategory}
              </span>
            </div>
          </div>
        </div>

        {!currentCard.revealed ? (
          <div className="space-y-2">
            <Button
              onClick={handleRevealSong}
              className="w-full h-12 bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-600 hover:to-indigo-600 border border-purple-400/50"
              style={{ boxShadow: '0 0 15px rgba(168,85,247,0.3)' }}
            >
              <ExternalLinkIcon className="mr-2 h-4 w-4" />
              Revelar Canción
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 border-purple-400/50 text-purple-300 hover:bg-purple-500/20"
              onClick={() => window.open(currentCard.spotifyUrl, '_blank')}
            >
              <ExternalLinkIcon className="mr-2 h-4 w-4" />
              Abrir en Spotify
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={handleMarkingControl}
              disabled={markingEnabledThisRound && !isMarkingEnabled}
              className={`w-full h-12 transition-all duration-300 ${isMarkingEnabled
                  ? 'bg-yellow-500/80 hover:bg-yellow-500 border-yellow-400'
                  : markingEnabledThisRound && !isMarkingEnabled
                    ? 'bg-gray-500/50 border-gray-400 cursor-not-allowed'
                    : 'bg-green-500/80 hover:bg-green-500 border-green-400'
                } border`}
              style={
                !markingEnabledThisRound || isMarkingEnabled
                  ? { boxShadow: '0 0 15px rgba(34,197,94,0.3)' }
                  : {}
              }
            >
              {isMarkingEnabled
                ? 'Deshabilitar Marcado'
                : markingEnabledThisRound
                  ? 'Marcado Ya Utilizado'
                  : 'Habilitar Marcado'
              }
            </Button>

            <Button
              onClick={handleNewRound}
              variant="outline"
              className="w-full h-12 border-white/20 text-white/80 hover:bg-white/10"
            >
              <RefreshCwIcon className="w-4 h-4 mr-2" />
              Nueva Ronda
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Pantalla de login
  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-[#1a0133] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Fondo con cuadrícula */}
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
          className="w-[90%] max-w-sm bg-black/40 backdrop-blur-lg rounded-xl shadow-xl overflow-hidden border border-white/10"
        >
          <div className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-white mb-2"
                style={{
                  textShadow: '0 0 10px rgba(255,255,255,0.8)'
                }}>
                Music Bingo
              </h1>
              <h2 className="text-xl text-purple-300">Game Master</h2>
            </div>

            {connectionError && (
              <Alert variant="destructive" className="bg-red-500/20 border border-red-500/50">
                <AlertCircle className="h-4 w-4 text-white" />
                <AlertDescription className="text-white">{connectionError}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={login}
              className="w-full h-12 bg-[#1DB954] hover:bg-[#1ed760] transition-all duration-300 flex items-center justify-center gap-2 group"
              style={{
                boxShadow: '0 0 15px rgba(29,185,84,0.3)'
              }}
            >
              <svg
                className="w-6 h-6 group-hover:scale-110 transition-transform duration-300"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              <span className="text-lg font-semibold">
                Conectar con Spotify
              </span>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Pantalla principal
  return (
    <div className="min-h-screen bg-[#1a0133] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Fondo con cuadrícula */}
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

      <div className="w-[95%] max-w-xl mx-auto bg-black/40 backdrop-blur-lg rounded-xl shadow-xl overflow-hidden border border-white/10">
        <div className="bg-black/60 p-4">
          <h1 className="text-2xl md:text-3xl font-bold text-center text-white"
            style={{ textShadow: '0 0 10px rgba(255,255,255,0.8)' }}>
            Music Bingo
          </h1>
        </div>

        {connectionError && (
          <Alert variant="destructive" className="m-4 bg-red-500/20 border border-red-500/50">
            <AlertCircle className="h-4 w-4 text-white" />
            <AlertDescription className="text-white">{connectionError}</AlertDescription>
          </Alert>
        )}

        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Select
                value={difficulty}
                onValueChange={handleDifficultyChange}
              >
                <SelectTrigger className="w-full bg-black/30 border-white/20 text-white">
                  <SelectValue placeholder="Nivel de juego" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="principiante">🟢 Principiante</SelectItem>
                  <SelectItem value="experto">🔥 Experto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-white/80 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                <Users className="w-4 h-4" />
                <span>{connectedPlayers.length} jugadores</span>
              </div>
              <div className="text-sm text-purple-300">
                Sala: {roomCode}
              </div>
            </div>

            {gameStep !== 'wheel' && (
              <Button
                onClick={handleNewRound}
                variant="outline"
                className="flex-shrink-0 border-white/20 text-white hover:bg-white/10"
              >
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Nueva Categoría
              </Button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {gameStep === 'wheel' ? (
              <motion.div
                key="wheel"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="py-4"
              >
                <CategoryWheel
                  difficulty={difficulty}
                  onCategorySelected={handleCategorySelected}
                />
              </motion.div>
            ) : (
              <motion.div
                key="card-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {selectedCategory && (
                  <div
                    className={`${selectedCategory.color} p-4 rounded-lg flex items-center justify-center gap-3 border border-white/20`}
                    style={{ boxShadow: '0 0 15px rgba(255,255,255,0.1)' }}
                  >
                    <div className="flex items-center gap-2">
                      {selectedCategory.icon && (
                        <selectedCategory.icon
                          size={24}
                          className="text-gray-800"
                        />
                      )}
                      <span className="text-base font-medium text-gray-800">
                        {selectedCategory.name}
                      </span>
                    </div>
                  </div>
                )}

                {!currentCard ? (
                  <Button
                    onClick={generateNewCard}
                    disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-600 hover:to-indigo-600 border border-purple-400/50"
                    style={{ boxShadow: '0 0 15px rgba(168,85,247,0.3)' }}
                  >
                    {isLoading ? 'Generando...' : 'Generar Tarjeta'}
                  </Button>
                ) : (
                  <Card className="bg-black/30 border border-white/20 p-4">
                    {renderCardContent()}
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {connectedPlayers.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-lg text-white mb-3">
                Jugadores Conectados
              </h3>
              <div className="bg-black/30 rounded-lg divide-y divide-white/10 border border-white/20">
                {connectedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3"
                  >
                    <span className="font-medium text-white">{player.name}</span>
                    {player.isHost && (
                      <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-1 rounded-full border border-purple-400/50">
                        Game Master
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

GameMaster.propTypes = {
  roomCode: PropTypes.string.isRequired,
  difficulty: PropTypes.oneOf(['principiante', 'experto']).isRequired
};

export default GameMaster;