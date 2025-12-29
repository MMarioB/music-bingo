import { Button } from './ui/button';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { GamepadIcon, UsersIcon } from 'lucide-react';

const RoleSelection = ({ onSelectRole }) => {
  return (
    <div className="w-full flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Título principal con efecto neón */}
      <motion.h1
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="font-audiowide text-4xl sm:text-6xl md:text-7xl text-center mb-8 sm:mb-12"
      >
        <motion.span
          className="text-neon-white inline-block"
          animate={{
            textShadow: [
              '0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(168,85,247,0.6), 0 0 30px rgba(168,85,247,0.4)',
              '0 0 15px rgba(255,255,255,1), 0 0 30px rgba(168,85,247,0.8), 0 0 45px rgba(168,85,247,0.6)',
              '0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(168,85,247,0.6), 0 0 30px rgba(168,85,247,0.4)',
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          MUSIC
        </motion.span>
        {' '}
        <motion.span
          className="text-neon-pink inline-block"
          animate={{
            textShadow: [
              '0 0 10px rgba(236,72,153,0.8), 0 0 20px rgba(236,72,153,0.6), 0 0 30px rgba(236,72,153,0.4)',
              '0 0 15px rgba(236,72,153,1), 0 0 30px rgba(236,72,153,0.8), 0 0 45px rgba(236,72,153,0.6)',
              '0 0 10px rgba(236,72,153,0.8), 0 0 20px rgba(236,72,153,0.6), 0 0 30px rgba(236,72,153,0.4)',
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        >
          BINGO
        </motion.span>
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="w-full max-w-sm sm:max-w-md glass-card-strong rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden pulse-glow"
      >
        
        <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              className="w-full py-6 sm:py-8 text-base sm:text-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center justify-center space-x-2 sm:space-x-3"
              onClick={() => onSelectRole('master')}
            >
              <GamepadIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Game Master</span>
            </Button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              variant="outline"
              className="w-full py-6 sm:py-8 text-base sm:text-lg border-purple-400 text-purple-700 hover:bg-purple-50 transition-colors flex items-center justify-center space-x-2 sm:space-x-3"
              onClick={() => onSelectRole('player')}
            >
              <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Jugador</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1 }}
        className="mt-4 sm:mt-6 text-sm sm:text-base text-center text-gray-600"
      >
        Selecciona tu rol para comenzar el juego
      </motion.div>
    </div>
  );
};

RoleSelection.propTypes = {
  onSelectRole: PropTypes.func.isRequired
};

export default RoleSelection;