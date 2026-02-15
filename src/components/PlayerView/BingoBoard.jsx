import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

// Estilos y objetos de animación estáticos extraídos fuera del render
const checkStyle = { filter: 'drop-shadow(0 0 8px rgb(74 222 128 / 0.5))' };
const pulseBoxShadows = [
  '0 0 0px rgba(168, 85, 247, 0)',
  '0 0 20px rgba(168, 85, 247, 0.5)',
  '0 0 0px rgba(168, 85, 247, 0)'
];
const hoverMarkable = { scale: 1.1, rotate: [0, -2, 2, 0] };
const tapMarkable = { scale: 0.95 };
const emptyObj = {};
const baseAnimate = { scale: 1, opacity: 1 };
const baseTransition = { scale: { duration: 0.3 }, opacity: { duration: 0.3 } };
const pulseTransition = { repeat: Infinity, duration: 2 };
const checkEnterTransition = { type: 'spring', stiffness: 300, damping: 20 };
const checkScaleTransition = { duration: 0.5 };
const checkInitial = { scale: 0, rotate: -180 };
const checkAnimate = { scale: 1, rotate: 0 };
const checkScaleAnimate = { scale: [1, 1.3, 1] };

const BingoBoard = ({ board, currentCategory, currentSong, canMark, onCellClick }) => {

  // Calcular targetCategory UNA sola vez fuera del loop
  const targetCategory = useMemo(() => {
    return currentSong?.revealed && currentSong?.category
      ? currentSong.category
      : currentCategory?.name;
  }, [currentSong?.revealed, currentSong?.category, currentCategory?.name]);

  const handleCellClick = useCallback((index, cellName) => {
    if (canMark && cellName === targetCategory) {
      onCellClick(index);
    }
  }, [canMark, targetCategory, onCellClick]);

  return (
    <div className="flex-1 flex flex-col justify-center">
      <Card className="bg-black/30 border border-white/20 p-2 md:p-4">
        <div className="grid grid-cols-5 gap-1 md:gap-3">
          {board && board.map((cell, index) => {
            const isMarkable = canMark && cell.name === targetCategory;
            const isCurrentCategory = cell.name === targetCategory;
            const shouldPulse = isCurrentCategory && !cell.marked && canMark;

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
                `}
                onClick={() => handleCellClick(index, cell.name)}
                disabled={!isMarkable}
                aria-label={`Casilla ${cell.name} ${cell.marked ? '(marcada)' : ''}`}
                title={`${cell.name}${isCurrentCategory ? ' - Categoría actual' : ''}${cell.marked ? ' ✓' : ''}`}
                animate={shouldPulse
                  ? { scale: [1, 1.05, 1], opacity: 1, boxShadow: pulseBoxShadows }
                  : baseAnimate
                }
                transition={shouldPulse ? pulseTransition : baseTransition}
                whileHover={isMarkable ? hoverMarkable : emptyObj}
                whileTap={isMarkable ? tapMarkable : emptyObj}
              >
                {shouldPulse && (
                  <div className="absolute inset-0 flex items-center justify-center bg-purple-500/10 backdrop-blur-sm rounded-lg border-2 border-purple-400 border-dashed">
                    <span className="text-white text-xs font-bold">¡Marca aquí!</span>
                  </div>
                )}

                {cell.marked && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg"
                    initial={checkInitial}
                    animate={checkAnimate}
                    transition={checkEnterTransition}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={checkScaleAnimate}
                      transition={checkScaleTransition}
                    >
                      <Check
                        className="text-green-400 w-6 md:w-10 h-6 md:h-10"
                        style={checkStyle}
                      />
                    </motion.div>
                  </motion.div>
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
  currentSong: PropTypes.object,
  onCellClick: PropTypes.func.isRequired,
};

BingoBoard.displayName = 'BingoBoard';
export default React.memo(BingoBoard);
