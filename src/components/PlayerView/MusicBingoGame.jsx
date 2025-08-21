import { useEffect, useMemo } from 'react';
import { Trophy } from 'lucide-react';
import PropTypes from 'prop-types';
import { useMusicBingoLogic } from './MusicBingoGameLogic';
import GameLayout from '../GameLayout';
import PlayerPredictions from '../PlayerView/PlayerPredictions';
import GameStatusAlert from '../PlayerView/GameStatusAlert';
import BingoBoard from './BingoBoard';

const MusicBingoGame = ({ playerName, roomCode, difficulty }) => {
  const logic = useMusicBingoLogic({ playerName, roomCode, difficulty });

  const canPlayerMark = useMemo(() => {
    if (!logic.isMarkingEnabled) return false;
    const currentPlayer = logic.connectedPlayers.find(p => p.name === playerName);
    if (!currentPlayer) return false;
    return !!logic.playerCorrectStatus[currentPlayer.id];
  }, [logic.isMarkingEnabled, logic.connectedPlayers, logic.playerCorrectStatus, playerName]);

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
        <p className="text-white/70 text-center">Espera a que el Game Master inicie un nuevo juego...</p>
      </div>
    </div>
  );

  return (
    <GameLayout roomCode={roomCode} playersCount={logic.connectedPlayers.length}>
      {logic.gameOver && renderGameOver()}
      <div className="flex flex-col flex-1 space-y-4">
        
        <GameStatusAlert gameState={logic} playerName={playerName} />

        {logic.currentCategory && (
          <div className={`${logic.currentCategory.color} p-3 rounded-lg text-center border border-white/20`}>
            <h3 className="font-semibold text-lg text-gray-800">{logic.currentCategory.name}</h3>
          </div>
        )}

        {logic.board.length > 0 && (
          <BingoBoard
            board={logic.board}
            canMark={canPlayerMark}
            currentCategory={logic.currentCategory}
            onCellClick={logic.handleCellClick}
          />
        )}
        
        <PlayerPredictions
          gameState={logic}
          predictions={logic.myPredictions}
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