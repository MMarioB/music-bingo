import { Button } from './ui/button';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { GamepadIcon, UsersIcon } from 'lucide-react';

const RoleSelection = ({ onSelectRole }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm sm:max-w-md bg-white/80 backdrop-blur-lg rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 sm:p-6">
          <h1 className="text-2xl sm:text-4xl font-bold text-center text-white drop-shadow-md">
            Music Bingo
          </h1>
        </div>
        
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