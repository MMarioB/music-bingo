import { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import PropTypes from 'prop-types';

import { useMusicBingoLogic } from './MusicBingoGameLogic';
import GameLayout from '../GameLayout';
import PlayerPredictions from '../PlayerView/PlayerPredictions';
import GameStatusAlert from '../PlayerView/GameStatusAlert';
import BingoBoard from './BingoBoard';

const MusicBingoGame = ({ playerName, roomCode, difficulty }) => {
  const [lastMarkedIndex, setLastMarkedIndex] = useState(null);
  const [hasMarkedThisRound, setHasMarkedThisRound] = useState(false);

  const logic = useMusicBingoLogic({ playerName, roomCode, difficulty });

  // Lógica para manejar el click en una celda
  const handleMarkCell = (index) => {
    if (!logic.canMark) return;

    // Caso 1: Desmarcar la celda ya seleccionada
    if (lastMarkedIndex === index) {
      logic.handleCellClick(index, true); // Desmarcar
      setLastMarkedIndex(null);
      setHasMarkedThisRound(false);
    }
    // Caso 2: Cambiar la selección a una nueva celda
    else if (lastMarkedIndex !== null) {
      logic.handleCellClick(lastMarkedIndex, true); // Desmarcar la anterior
      logic.handleCellClick(index); // Marcar la nueva
      setLastMarkedIndex(index);
    }
    // Caso 3: Marcar una celda por primera vez en la ronda
    else if (!hasMarkedThisRound) {
      logic.handleCellClick(index);
      setLastMarkedIndex(index);
      setHasMarkedThisRound(true);
    }
  };

  // Reiniciar el estado de marcado al cambiar de categoría
  useEffect(() => {
    setLastMarkedIndex(null);
    setHasMarkedThisRound(false);
  }, [logic.currentCategory]);

  // Temporizador para limpiar errores de conexión
  useEffect(() => {
    let timer;
    if (logic.connectionError) {
      timer = setTimeout(() => {
        logic.setConnectionError(null);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [logic.connectionError, logic.setConnectionError]);

  const renderGameOver = () => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-black/90 border border-purple-500/50 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-white text-center mb-6 flex items-center justify-center">
          <Trophy className="h-8 w-8 text-yellow-400 mr-3" />
          ¡Juego Finalizado!
        </h2>
        {/* ... (resto del contenido del Game Over, sin cambios) ... */}
        <p className="text-white/70 text-center">
            Espera a que el Game Master inicie un nuevo juego...
        </p>
      </div>
    </div>
  );

  return (
    <GameLayout
      roomCode={roomCode}
      playersCount={logic.connectedPlayers.length}
      showSelect={false}
    >
      {logic.gameOver && renderGameOver()}

      <div className="flex flex-col flex-1 space-y-4">
        
        {/* Componente centralizado para todas las alertas */}
        <GameStatusAlert {...logic} lastMarkedIndex={lastMarkedIndex} />

        {/* Encabezado de la categoría actual */}
        {logic.currentCategory && (
          <div
            className={`${logic.currentCategory.color} p-3 rounded-lg text-center border border-white/20`}
            style={{ boxShadow: '0 0 15px rgba(255,255,255,0.1)' }}
          >
            <h3 className="font-semibold text-lg text-gray-800">{logic.currentCategory.name}</h3>
          </div>
        )}

        {/* Componente del tablero */}
        {(logic.gamePhase === 'playing' || logic.currentCategory) && (
          <BingoBoard
            board={logic.board}
            canMark={logic.canMark}
            currentCategory={logic.currentCategory}
            lastMarkedIndex={lastMarkedIndex}
            hasMarkedThisRound={hasMarkedThisRound}
            onCellClick={handleMarkCell}
          />
        )}
        
        {/* Componente de predicciones */}
        <PlayerPredictions
          isRevealed={!!logic.currentSong}
          onSubmitPrediction={logic.handlePrediction}
          predictions={logic.predictions}
          currentSongStarted={logic.songStarted}
          disabled={!logic.canPredict}
          timeRemaining={logic.predictionTimeRemaining > 0 ? logic.predictionTimeRemaining : null}
        />
      </div>
    </GameLayout>
  );
};

MusicBingoGame.propTypes = {
  playerName: PropTypes.string.isRequired,
  roomCode: PropTypes.string.isRequired,
  difficulty: PropTypes.oneOf(['principiante', 'experto']).isRequired
};

export default MusicBingoGame;