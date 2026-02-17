import React from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle, InfoIcon, Check, XCircleIcon, PartyPopper, Clock, Target, CheckCircle } from 'lucide-react';

const alertConfig = {
  error: { className: "bg-red-500/20 border-red-500/50 text-red-300", Icon: XCircleIcon },
  success: { className: "bg-green-500/20 border-green-500/50 text-green-300", Icon: Check },
  warning: { className: "bg-yellow-500/20 border-yellow-400/50 text-yellow-300", Icon: AlertCircle },
  info: { className: "bg-blue-500/20 border-blue-400/50 text-blue-300", Icon: InfoIcon },
  bingo: { className: "bg-green-500/20 border-green-500/50 text-green-300 font-bold", Icon: PartyPopper },
  waiting: { className: "bg-purple-500/20 border-purple-400/50 text-purple-300", Icon: Clock },
  marked: { className: "bg-emerald-500/20 border-emerald-400/50 text-emerald-300", Icon: CheckCircle },
  pending: { className: "bg-orange-500/20 border-orange-400/50 text-orange-300", Icon: Target },
  serverWaking: { className: "bg-cyan-500/20 border-cyan-500/50 text-cyan-300", Icon: InfoIcon },
};

const getAlertInfo = ({ gameState, playerName }) => {
  const { gameStep, isMarkingEnabled, playerCorrectStatus, currentCategory, currentSong, winners, connectionError, hasMarkedInCurrentRound, markingJustDisabled, serverWaking, error, currentControllerName } = gameState;
  const controllerLabel = currentControllerName || 'el Game Master';

  if (serverWaking && error) return { type: 'serverWaking', message: error };
  if (connectionError) return { type: 'error', message: `❌ ${connectionError}` };
  if (error) return { type: 'error', message: `❌ ${error}` };

  const player = gameState.connectedPlayers.find(p => p.name === playerName);
  const isWinner = winners.some(w => w.id === player?.id);
  const isEligible = player && playerCorrectStatus[player.id];

  if (isWinner) return { type: 'bingo', message: '🎉 ¡BINGO! ¡Has ganado esta partida! Espera a que el Game Master finalice el juego.' };

  if (gameStep === 'reviewing') {
    if (isEligible) {
      if (isMarkingEnabled) {
        if (hasMarkedInCurrentRound) {
          return { type: 'marked', message: `✅ Celda marcada correctamente. Espera a que ${controllerLabel} deshabilite el marcado.` };
        }
        if (currentCategory) {
          return { type: 'success', message: `🎯 ¡Correcto! Marca UNA casilla de "${currentCategory.name}". Puedes desmarcar y cambiar si te equivocas.` };
        }
        return { type: 'success', message: `✅ ¡Has acertado! Espera a que ${controllerLabel} seleccione una categoría para marcar.` };
      } else {
        if (markingJustDisabled) {
          return { type: 'info', message: '✅ Marcado deshabilitado. Preparando siguiente ronda...' };
        }
        return { type: 'waiting', message: `⏳ ¡Has acertado! Espera a que ${controllerLabel} habilite el marcado.` };
      }
    } else {
      const gameMasterHasStartedReview = isMarkingEnabled || Object.values(playerCorrectStatus || {}).some(status => status === true);

      if (currentSong?.revealed && gameMasterHasStartedReview) {
        return { type: 'error', message: '❌ No has acertado esta vez. ¡Sigue intentando en la próxima ronda!' };
      } else if (currentSong?.revealed) {
        return { type: 'pending', message: `🎵 Canción revelada. Espera a que ${controllerLabel} revise las predicciones...` };
      }
    }
  }

  if (gameStep === 'playing' && currentSong) {
    return { type: 'info', message: '🎵 ¡Escucha la canción! Escribe tus predicciones abajo. Puedes cambiarlas hasta que se revele.' };
  }

  if (gameStep === 'playing' && !currentSong) {
    return { type: 'info', message: `⏳ Espera a que ${controllerLabel} reproduzca una canción...` };
  }

  if (gameStep === 'wheel') {
    return { type: 'info', message: `🎡 ${controllerLabel} está girando la ruleta para seleccionar una categoría...` };
  }

  if (gameStep === 'waiting') {
    return { type: 'info', message: '👥 Esperando a que todos los jugadores estén listos...' };
  }

  return null;
};

const GameStatusAlert = (props) => {
  const alertInfo = getAlertInfo(props);
  if (!alertInfo) return null;

  const { type, message } = alertInfo;
  const config = alertConfig[type];

  return (
    <div className="animate-slideDown">
      <Alert className={config.className}>
        <config.Icon className="h-5 w-5 mr-2" />
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default React.memo(GameStatusAlert);
