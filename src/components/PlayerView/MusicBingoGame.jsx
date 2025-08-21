import { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import PropTypes from 'prop-types';
import { useMusicBingoLogic } from './MusicBingoGameLogic';
import GameLayout from '../GameLayout';
import PlayerPredictions from '../PlayerView/PlayerPredictions';
import GameStatusAlert from '../PlayerView/GameStatusAlert';
import BingoBoard from './BingoBoard';

const MusicBingoGame = ({ playerName, roomCode, difficulty }) => {
  // El estado local ahora solo gestiona la UI, no la lógica del juego.
  const [lastMarkedIndex, setLastMarkedIndex] = useState(null);

  console.log(lastMarkedIndex)

  // El hook ahora nos da todo el estado del juego directamente.
  const logic = useMusicBingoLogic({ playerName, roomCode, difficulty });

  const handleMarkCell = (index) => {
    // La lógica de si se puede marcar ya está dentro de `handleCellClick` en el hook.
    logic.handleCellClick(index);
    // La UI local puede decidir cómo manejar la selección visual.
    setLastMarkedIndex(prev => prev === index ? null : index);
  };
  
  // Reiniciar la selección visual cuando cambia la categoría.
  useEffect(() => {
    setLastMarkedIndex(null);
  }, [logic.currentCategory]);

  // Temporizador para limpiar errores de conexión.
  useEffect(() => {
    let timer;
    if (logic.error) {
      timer = setTimeout(() => logic.setError(null), 4000);
    }
    return () => clearTimeout(timer);
  }, [logic.error, logic.setError]);

  const renderGameOver = () => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-black/90 border border-purple-500/50 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-white text-center mb-6 flex items-center justify-center">
          <Trophy className="h-8 w-8 text-yellow-400 mr-3" />
          ¡Juego Finalizado!
        </h2>
        <p className="text-white/70 text-center">Espera a que el Game Master inicie un nuevo juego...</p>
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
        
        <GameStatusAlert {...logic} />

        {logic.currentCategory && (
          <div className={`${logic.currentCategory.color} p-3 rounded-lg text-center border border-white/20`} style={{ boxShadow: '0 0 15px rgba(255,255,255,0.1)' }}>
            <h3 className="font-semibold text-lg text-gray-800">{logic.currentCategory.name}</h3>
          </div>
        )}

        {/* El tablero se muestra si ya ha sido generado */}
        {logic.board.length > 0 && (
          <BingoBoard
            board={logic.board}
            canMark={logic.isMarkingEnabled} // Ahora usamos el estado del servidor
            currentCategory={logic.currentCategory}
            onCellClick={handleMarkCell}
          />
        )}
        
        <PlayerPredictions
          isRevealed={!!logic.currentSong?.revealed}
          onSubmitPrediction={logic.handlePrediction}
          // El resto de props para predicciones
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