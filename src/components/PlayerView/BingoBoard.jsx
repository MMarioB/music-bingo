import React from 'react';
import PropTypes from 'prop-types';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const BingoBoard = ({ board, currentCategory, canMark, onCellClick }) => {
  return (
    <div className="flex-1 flex flex-col justify-center">
      <Card className="bg-black/30 border border-white/20 p-2 md:p-4">
        <div className="grid grid-cols-5 gap-1 md:gap-3">
          {board && board.map((cell, index) => {
            // La lógica de si una celda es "marcable" ahora es más simple.
            const isMarkable = canMark && cell.name === currentCategory?.name;

            return (
              <motion.button
                key={index}
                className={`
                  ${cell.color} aspect-square rounded-lg flex items-center justify-center p-1 md:p-2
                  text-center relative transition-all duration-200 border border-white/20
                  ${isMarkable ? 'cursor-pointer hover:ring-2 hover:ring-purple-400' : 'cursor-default'}
                  ${cell.marked ? 'scale-95 shadow-inner' : 'shadow hover:shadow-md'}
                `}
                onClick={() => isMarkable && onCellClick(index)}
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

BingoBoard.propTypes = {
  board: PropTypes.array.isRequired,
  canMark: PropTypes.bool.isRequired,
  currentCategory: PropTypes.object,
  onCellClick: PropTypes.func.isRequired,
};

BingoBoard.displayName = 'BingoBoard';
export default React.memo(BingoBoard);