import { Alert, AlertDescription } from '../ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, InfoIcon, Check, XCircleIcon, PartyPopper } from 'lucide-react';

const alertConfig = {
  error: { className: "bg-red-500/20 border-red-500/50 text-red-300", Icon: XCircleIcon },
  success: { className: "bg-green-500/20 border-green-500/50 text-green-300", Icon: Check },
  warning: { className: "bg-yellow-500/20 border-yellow-400/50 text-yellow-300", Icon: AlertCircle },
  info: { className: "bg-blue-500/20 border-blue-400/50 text-blue-300", Icon: InfoIcon },
  bingo: { className: "bg-green-500/20 border-green-500/50 text-green-300 font-bold", Icon: PartyPopper },
};

const getAlertInfo = ({ gameState, playerName }) => {
  const { gameStep, isMarkingEnabled, playerCorrectStatus, currentCategory, currentSong, winners, connectionError } = gameState;

  // Prioridad 1: Errores de conexión
  if (connectionError) return { type: 'error', message: connectionError };

  const player = gameState.connectedPlayers.find(p => p.name === playerName);
  const isWinner = winners.some(w => w.id === player?.id);
  const isEligible = player && playerCorrectStatus[player.id];

  if (isWinner) return { type: 'bingo', message: '¡BINGO! ¡Has ganado esta partida!' };

  if (gameStep === 'reviewing') {
    if (isEligible) {
      if (isMarkingEnabled) {
        if (currentCategory) {
            return { type: 'success', message: `¡Correcto! Puedes marcar una casilla de "${currentCategory.name}".` };
        }
      } else {
        return { type: 'warning', message: '¡Has acertado! Espera a que el host habilite el marcado.' };
      }
    } else {
      if (currentSong?.revealed) {
        return { type: 'error', message: 'No has acertado. ¡Mejor suerte en la próxima ronda!' };
      }
    }
  }

  if (gameStep === 'playing' && currentSong) {
    return { type: 'info', message: '¡Adivina la canción! Escribe tu predicción abajo.' };
  }
  
  if (gameStep === 'playing' && !currentSong) {
    return { type: 'info', message: 'Espera a que el Game Master ponga una canción.' };
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