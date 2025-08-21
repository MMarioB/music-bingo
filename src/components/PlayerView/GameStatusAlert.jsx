import { Alert, AlertDescription } from '../ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, InfoIcon, Check, XCircleIcon } from 'lucide-react';

const alertConfig = {
  error: {
    className: "bg-red-500/20 border-red-500/50 text-red-300",
    Icon: XCircleIcon,
    iconClassName: "text-red-400"
  },
  success: {
    className: "bg-green-500/20 border-green-500/50 text-green-300",
    Icon: Check,
    iconClassName: "text-green-400"
  },
  warning: {
    className: "bg-yellow-500/20 border-yellow-400/50 text-yellow-300",
    Icon: AlertCircle,
    iconClassName: "text-yellow-400"
  },
  info: {
    className: "bg-blue-500/20 border-blue-400/50 text-blue-300",
    Icon: InfoIcon,
    iconClassName: "text-blue-400"
  },
  bingo: {
    className: "bg-green-500/20 border-green-500/50 text-green-300 font-semibold text-sm md:text-base",
    Icon: Check,
    iconClassName: "text-green-400"
  }
};

const getAlertInfo = ({
  connectionError, hasWinner, isMarkedAsIncorrect, songStarted, predictionTimeRemaining, predictions, canMark, isEligibleToMark, currentCategory, currentSong, lastMarkedIndex
}) => {
  // 1. Errores de conexión (máxima prioridad)
  if (connectionError) {
    return { type: 'error', message: connectionError };
  }
  // 2. Anuncio de BINGO
  if (hasWinner) {
    return { type: 'bingo', message: '¡BINGO! ¡Has completado una línea!' };
  }
  // 3. Tiempo de predicción agotado
  if (songStarted && predictionTimeRemaining === 0 && predictions.length === 0) {
    return { type: 'error', message: '¡Se ha agotado el tiempo para hacer predicciones!' };
  }
  // 4. Marcado como incorrecto
  if (isMarkedAsIncorrect) {
    return { type: 'error', message: 'No has acertado. No podrás marcar en esta ronda.' };
  }
  // 5. Estado del marcado y espera
  if (canMark) {
    if (lastMarkedIndex !== null) {
      return { type: 'info', message: 'Puedes desmarcar la casilla para elegir otra.' };
    }
    return { type: 'success', message: `¡Puedes marcar una casilla de "${currentCategory.name}" ahora!` };
  }
  if (isEligibleToMark) {
    return { type: 'warning', message: 'Espera a que el Game Master habilite el marcado.' };
  }
  // 6. Mensaje por defecto durante la ronda
  if (currentSong) {
    return { type: 'info', message: 'Espera a ver si has acertado.' };
  }
  if (currentCategory) {
    return { type: 'info', message: 'Espera a que el Game Master revele la canción.' };
  }

  return null; // No mostrar ninguna alerta
};

const GameStatusAlert = (props) => {
  const alertInfo = getAlertInfo(props);

  if (!alertInfo) {
    return null;
  }

  const { type, message } = alertInfo;
  const config = alertConfig[type];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <Alert className={config.className}>
          <config.Icon className={`h-5 w-5 mr-2 ${config.iconClassName}`} />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
};

export default GameStatusAlert;