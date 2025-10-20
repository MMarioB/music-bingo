import React from 'react';
import PropTypes from 'prop-types';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const BingoBoard = ({ board, currentCategory, canMark, onCellClick }) => {

  const handleCellClick = (index, cell) => {
    console.log('🎯 BingoBoard - Click en celda:', {
      index,
      cellName: cell.name,
      currentCategory: currentCategory?.name,
      canMark,
      isRightCategory: cell.name === currentCategory?.name
    });

    if (canMark && cell.name === currentCategory?.name) {
      onCellClick(index);
    } else {
      console.log('⚠️ Click ignorado:', {
        reason: !canMark ? 'No puede marcar' : 'Categoría incorrecta'
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center">
      <Card className="bg-black/30 border border-white/20 p-2 md:p-4">
        <div className="grid grid-cols-5 gap-1 md:gap-3">
          {board && board.map((cell, index) => {
            // La lógica de si una celda es "marcable"
            const isMarkable = canMark && cell.name === currentCategory?.name;
            const isCurrentCategory = cell.name === currentCategory?.name;

            return (
              <motion.button
                key={index}
                className={`
                  ${cell.color} aspect-square rounded-lg flex items-center justify-center p-1 md:p-2
                  text-center relative transition-all duration-200 border
                  ${isMarkable
                    ? 'cursor-pointer hover:ring-2 hover:ring-purple-400 border-purple-400'
                    : isCurrentCategory
                      ? 'cursor-not-allowed border-purple-400 opacity-50'
                      : 'cursor-default border-white/20'
                  }
                  ${cell.marked ? 'scale-95 shadow-inner' : 'shadow hover:shadow-md'}
                  ${isCurrentCategory && !cell.marked ? 'animate-pulse' : ''}
                `}
                onClick={() => handleCellClick(index, cell)}
                disabled={!isMarkable}
                aria-label={`Casilla ${cell.name} ${cell.marked ? '(marcada)' : ''}`}
                title={`${cell.name}${isCurrentCategory ? ' - Categoría actual' : ''}${cell.marked ? ' ✓' : ''}`}
              >
                {/* Indicador visual de categoría actual */}
                {isCurrentCategory && !cell.marked && canMark && (
                  <div className="absolute inset-0 flex items-center justify-center bg-purple-500/10 backdrop-blur-sm rounded-lg border-2 border-purple-400 border-dashed">
                    <span className="text-white text-xs font-bold">¡Marca aquí!</span>
                  </div>
                )}

                {/* Checkmark cuando está marcada */}
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