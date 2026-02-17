import React, { useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Trophy, Check, RefreshCwIcon, ExternalLinkIcon, Users } from 'lucide-react';
import PropTypes from 'prop-types';
import { useMusicBingoLogic } from './MusicBingoGameLogic';
import GameLayout from '../GameLayout';
import PlayerPredictions from '../PlayerView/PlayerPredictions';
import GameStatusAlert from '../PlayerView/GameStatusAlert';
import BingoBoard from './BingoBoard';
import { Button } from '../ui/button';

const CategoryWheel = lazy(() => import('../Wheel/CategoryWheel'));

const MusicBingoGame = ({ playerName, roomCode, difficulty }) => {
  const logic = useMusicBingoLogic({ playerName, roomCode, difficulty });

  const canPlayerMark = useMemo(() => {
    const currentPlayer = logic.connectedPlayers.find(p => p.name === playerName);
    if (!logic.isMarkingEnabled) return false;
    if (!currentPlayer) return false;
    return !!logic.playerCorrectStatus[currentPlayer.id];
  }, [logic.isMarkingEnabled, logic.connectedPlayers, logic.playerCorrectStatus, playerName]);

  useEffect(() => {
    let timer;
    // No auto-limpiar el error si el servidor está despertando
    if (logic.error && !logic.serverWaking) {
      timer = setTimeout(() => logic.setError(null), 5000);
    }
    return () => clearTimeout(timer);
  }, [logic.error, logic.serverWaking, logic.setError]);

  // === Controller action helpers ===
  const onControllerSelectCategory = useCallback((category) => {
    logic.sendControllerAction('selectCategory', { category });
  }, [logic.sendControllerAction]);

  const onControllerGenerateCard = useCallback(() => {
    logic.sendControllerAction('generateCard');
  }, [logic.sendControllerAction]);

  const onControllerRevealSong = useCallback(() => {
    logic.sendControllerAction('revealSong');
  }, [logic.sendControllerAction]);

  const onControllerMarkPlayer = useCallback((playerId) => {
    logic.sendControllerAction('markPlayer', { playerId });
  }, [logic.sendControllerAction]);

  const onControllerToggleMarking = useCallback(() => {
    logic.sendControllerAction('toggleMarking');
  }, [logic.sendControllerAction]);

  const onControllerNewRound = useCallback(() => {
    logic.sendControllerAction('newRound');
  }, [logic.sendControllerAction]);

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

  // === Panel de control (solo visible para el controlador de la ronda) ===
  const renderControllerPanel = () => {
    if (!logic.isController) return null;

    return (
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 space-y-3">
        <div className="text-center">
          <span className="text-cyan-300 text-sm font-semibold">🎮 Controlas esta ronda</span>
        </div>

        {/* Fase de ruleta */}
        {logic.gameStep === 'wheel' && (
          <Suspense fallback={<div className="text-center text-white/50 py-4">Cargando ruleta...</div>}>
            <CategoryWheel difficulty={difficulty} onCategorySelected={onControllerSelectCategory} />
          </Suspense>
        )}

        {/* Fase de categoría seleccionada pero sin canción */}
        {logic.currentCategory && !logic.currentSong && logic.gameStep !== 'wheel' && (
          <Button
            onClick={onControllerGenerateCard}
            className="w-full h-10 bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-600 hover:to-indigo-600 border border-purple-400/50 text-sm font-medium"
          >
            Generar Tarjeta
          </Button>
        )}

        {/* Canción sonando - botón revelar */}
        {logic.currentSong && !logic.currentSong.revealed && (
          <Button
            onClick={onControllerRevealSong}
            className="w-full h-10 bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-600 hover:to-indigo-600 border border-purple-400/50 text-sm font-semibold"
          >
            <ExternalLinkIcon className="mr-2 h-4 w-4" />
            Revelar Canción
          </Button>
        )}

        {/* Canción revelada - controles de marcado */}
        {logic.currentSong?.revealed && (
          <div className="space-y-2">
            {/* Lista de jugadores para marcar correctos */}
            {!logic.isMarkingEnabled && (
              <div className="space-y-1">
                <p className="text-xs text-white/50 mb-1">Marca los acertantes:</p>
                {logic.connectedPlayers.map(player => (
                  <div
                    key={player.id}
                    onClick={() => onControllerMarkPlayer(player.id)}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all text-sm ${
                      logic.playerCorrectStatus[player.id]
                        ? 'bg-green-500/20 border border-green-500/30'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      logic.playerCorrectStatus[player.id]
                        ? 'bg-green-500 border-green-500'
                        : 'border-white/50'
                    }`}>
                      {logic.playerCorrectStatus[player.id] && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-white truncate">{player.name}</span>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={onControllerToggleMarking}
              disabled={!Object.values(logic.playerCorrectStatus || {}).some(c => c) && !logic.isMarkingEnabled}
              className={`w-full h-9 text-sm transition-all ${
                logic.isMarkingEnabled
                  ? 'bg-yellow-500/80 hover:bg-yellow-500 border-yellow-400'
                  : Object.values(logic.playerCorrectStatus || {}).some(c => c)
                    ? 'bg-green-500/80 hover:bg-green-500 border-green-400'
                    : 'bg-gray-500/50 border-gray-400 cursor-not-allowed'
              } border`}
            >
              {logic.isMarkingEnabled ? 'Deshabilitar Marcado' : 'Habilitar Marcado'}
            </Button>

            <Button
              onClick={onControllerNewRound}
              variant="outline"
              className="w-full h-9 text-sm border-white/20 text-white/80 hover:bg-white/10"
            >
              <RefreshCwIcon className="w-3 h-3 mr-2" />
              Nueva Ronda
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <GameLayout roomCode={roomCode} playersCount={logic.connectedPlayers.length}>
      {logic.gameOver && renderGameOver()}
      <div className="flex flex-col flex-1 space-y-4">

        <GameStatusAlert gameState={logic} playerName={playerName} />

        {/* Panel de control si es el controlador */}
        {renderControllerPanel()}

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
            currentSong={logic.currentSong}
            onCellClick={logic.handleCellClick}
          />
        )}

        <PlayerPredictions
          gameState={logic}
          myPredictions={logic.myPredictions}
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

export default React.memo(MusicBingoGame);
