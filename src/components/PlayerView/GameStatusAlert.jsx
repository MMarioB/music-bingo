import { Alert, AlertDescription } from '../ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
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
};

const getAlertInfo = ({ gameState, playerName }) => {
  const { gameStep, isMarkingEnabled, playerCorrectStatus, currentCategory, currentSong, winners, connectionError, hasMarkedInCurrentRound } = gameState;

  // Prioridad 1: Errores de conexión
  if (connectionError) return { type: 'error', message: `❌ ${connectionError}` };

  const player = gameState.connectedPlayers.find(p => p.name === playerName);
  const isWinner = winners.some(w => w.id === player?.id);
  const isEligible = player && playerCorrectStatus[player.id];

  // Prioridad 2: ¡BINGO!
  if (isWinner) return { type: 'bingo', message: '🎉 ¡BINGO! ¡Has ganado esta partida! Espera a que el Game Master finalice el juego.' };

  // Fase de revisión (después de revelar la canción)
  if (gameStep === 'reviewing') {
    if (isEligible) {
      if (isMarkingEnabled) {
        if (hasMarkedInCurrentRound) {
          return { type: 'marked', message: '✅ Celda marcada correctamente. Espera a que el Game Master deshabilite el marcado.' };
        }
        if (currentCategory) {
          return { type: 'success', message: `🎯 ¡Correcto! Marca UNA casilla de "${currentCategory.name}". Puedes desmarcar y cambiar si te equivocas.` };
        }
        return { type: 'success', message: '✅ ¡Has acertado! Espera a que el Game Master seleccione una categoría para marcar.' };
      } else {
        return { type: 'waiting', message: '⏳ ¡Has acertado! Espera a que el Game Master te marque como correcto y habilite el marcado.' };
      }
    } else {
      if (currentSong?.revealed) {
        return { type: 'error', message: '❌ No has acertado esta vez. ¡Sigue intentando en la próxima ronda!' };
      } else {
        return { type: 'pending', message: '🎵 Canción revelada. Espera a que el Game Master revise las predicciones...' };
      }
    }
  }

  // Fase de juego (canción sonando)
  if (gameStep === 'playing' && currentSong) {
    return { type: 'info', message: '🎵 ¡Escucha la canción! Escribe tus predicciones abajo. Puedes cambiarlas hasta que se revele.' };
  }

  if (gameStep === 'playing' && !currentSong) {
    return { type: 'info', message: '⏳ Espera a que el Game Master reproduzca una canción...' };
  }

  // Fase de selección de categoría
  if (gameStep === 'wheel') {
    return { type: 'info', message: '🎡 El Game Master está girando la ruleta para seleccionar una categoría...' };
  }

  // Esperando inicio
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
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
        <Alert className={config.className}>
          <config.Icon className="h-5 w-5 mr-2" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
};

export default GameStatusAlert;