import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useMusicBingoLogic } from './MusicBingoGameLogic';
import GameLayout from '../GameLayout';
import PlayerPredictions from '../PlayerView/PlayerPredictions';
import GameStatusAlert from '../PlayerView/GameStatusAlert';
import BingoBoard from './BingoBoard';
import { Trophy } from 'lucide-react';

const MusicBingoGame = ({ playerName, roomCode, difficulty }) => {
  // El hook 'logic' contiene todo el estado y las funciones que necesitamos.
  const logic = useMusicBingoLogic({ playerName, roomCode, difficulty });

  // Temporizador para limpiar errores de conexión.
  useEffect(() => {
    let timer;
    if (logic.error) {
      timer = setTimeout(() => logic.setError(null), 5000);
    }
    return () => clearTimeout(timer);
  }, [logic.error, logic.setError]);

  const renderGameOver = () => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-black/90 border border-purple-500/50 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          <Trophy className="h-8 w-8 text-yellow-400 inline mr-3" />
          ¡Juego Finalizado!
        </h2>
        <div className="mb-4">
          <h3 className="font-semibold text-center text-lg mb-2">Ganadores</h3>
          {logic.winners.map(winner => (
             <p key={winner.id} className="text-center text-yellow-300">{winner.name}</p>
          ))}
        </div>
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
    >
      {logic.gameOver && renderGameOver()}
      <div className="flex flex-col flex-1 space-y-4">
        
        {/* <-- ¡LA CORRECCIÓN CLAVE! -->
            Pasamos el objeto 'logic' entero como el prop 'gameState'.
            También pasamos playerName que el componente necesita. */}
        <GameStatusAlert gameState={logic} playerName={playerName} />

        {logic.currentCategory && (
          <div className={`${logic.currentCategory.color} p-3 rounded-lg text-center border border-white/20`} style={{ boxShadow: '0 0 15px rgba(255,255,255,0.1)' }}>
            <h3 className="font-semibold text-lg text-gray-800">{logic.currentCategory.name}</h3>
          </div>
        )}

        {/* El tablero se muestra si ya ha sido generado */}
        {logic.board && logic.board.length > 0 && (
          <BingoBoard
            board={logic.board}
            // La lógica de si se puede marcar ahora depende directamente del estado del servidor
            canMark={logic.isMarkingEnabled && logic.playerCorrectStatus[logic.connectedPlayers.find(p => p.name === playerName)?.id]}
            currentCategory={logic.currentCategory}
            onCellClick={logic.handleCellClick}
          />
        )}
        
        {/* Hacemos lo mismo para PlayerPredictions */}
        <PlayerPredictions
          gameState={logic}
          onSubmitPrediction={logic.handlePrediction}
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