import React from 'react';
import PropTypes from 'prop-types';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const BingoBoard = ({ board, canMark, currentCategory, lastMarkedIndex, hasMarkedThisRound, onCellClick }) => {
  return (
    <div className="flex-1 flex flex-col justify-center">
      <Card className="bg-black/30 border border-white/20 p-2 md:p-4">
        <div className="grid grid-cols-5 gap-1 md:gap-3">
          {board.map((cell, index) => {
            const isSelected = index === lastMarkedIndex;
            const isMarkable = canMark && cell.name === currentCategory?.name && (!hasMarkedThisRound || isSelected);

            return (
              <motion.button
                key={index}
                // ... (el resto del JSX no cambia) ...
                className={`
                  ${cell.color} aspect-square rounded-lg flex items-center justify-center p-1 md:p-2
                  text-center relative transition-all duration-200 border border-white/20
                  ${isMarkable ? 'cursor-pointer hover:ring-2 hover:ring-purple-400' : 'cursor-default'}
                  ${cell.marked ? 'scale-95 shadow-inner' : 'shadow hover:shadow-md'}
                  ${isSelected ? 'ring-2 ring-purple-400' : ''}
                `}
                style={isSelected ? { boxShadow: '0 0 15px rgba(168,85,247,0.4)' } : {}}
                onClick={() => onCellClick(index)}
                disabled={!isMarkable}
                aria-label={`Casilla ${cell.name}`}
              >
                {cell.marked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg">
                    <Check
                      className="text-green-400 w-6 md:w-10 h-6 md:h-10"
                      style={{ filter: 'drop-shadow(0 0 8px rgb(74 222 128 / 0.5))' }}
                    />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

// 2. Define los propTypes para el componente
BingoBoard.propTypes = {
  board: PropTypes.arrayOf(PropTypes.shape({
    color: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    marked: PropTypes.bool.isRequired,
  })).isRequired,
  canMark: PropTypes.bool.isRequired,
  currentCategory: PropTypes.shape({
    name: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
  }),
  lastMarkedIndex: PropTypes.number,
  hasMarkedThisRound: PropTypes.bool.isRequired,
  onCellClick: PropTypes.func.isRequired,
};

// Esto es importante para que el nombre del componente se muestre correctamente en las React DevTools
BingoBoard.displayName = 'BingoBoard';

export default React.memo(BingoBoard);