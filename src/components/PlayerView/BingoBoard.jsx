import React from 'react';
import PropTypes from 'prop-types';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const BingoBoard = ({ board, currentCategory, currentSong, canMark, onCellClick }) => {

  const handleCellClick = (index, cell) => {
    // En modo experto: si la canción está revelada, usar su categoría
    // En modo principiante: usar currentCategory
    const targetCategory = currentSong?.revealed && currentSong?.category
      ? currentSong.category
      : currentCategory?.name;

    console.log('🎯 BingoBoard - Click en celda:', {
      index,
      cellName: cell.name,
      cellColor: cell.color,
      currentCategory: currentCategory?.name,
      currentSong: currentSong,
      targetCategory,
      canMark,
      isRightCategory: cell.name === targetCategory,
      cellMarked: cell.marked
    });

    if (canMark && cell.name === targetCategory) {
      console.log('✅ Marcando celda', index);
      onCellClick(index);
    } else {
      console.log('⚠️ Click ignorado:', {
        reason: !canMark ? 'No puede marcar (canMark=false)' : `Categoría incorrecta: celda='${cell.name}' vs target='${targetCategory}'`,
        canMark,
        cellName: cell.name,
        targetCategory
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center">
      <Card className="bg-black/30 border border-white/20 p-2 md:p-4">
        <div className="grid grid-cols-5 gap-1 md:gap-3">
          {board && board.map((cell, index) => {
            // En modo experto: si la canción está revelada, usar su categoría
            // En modo principiante: usar currentCategory
            const targetCategory = currentSong?.revealed && currentSong?.category
              ? currentSong.category
              : currentCategory?.name;

            // La lógica de si una celda es "marcable"
            const isMarkable = canMark && cell.name === targetCategory;
            const isCurrentCategory = cell.name === targetCategory;

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
                onClick={() => handleCellClick(index, cell)}
                disabled={!isMarkable}
                aria-label={`Casilla ${cell.name} ${cell.marked ? '(marcada)' : ''}`}
                title={`${cell.name}${isCurrentCategory ? ' - Categoría actual' : ''}${cell.marked ? ' ✓' : ''}`}
                // Animaciones mejoradas
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  ...(isCurrentCategory && !cell.marked && canMark && {
                    scale: [1, 1.05, 1],
                    boxShadow: [
                      '0 0 0px rgba(168, 85, 247, 0)',
                      '0 0 20px rgba(168, 85, 247, 0.5)',
                      '0 0 0px rgba(168, 85, 247, 0)'
                    ],
                  })
                }}
                transition={{
                  scale: { duration: 0.3, delay: index * 0.02 },
                  opacity: { duration: 0.3, delay: index * 0.02 },
                  ...(isCurrentCategory && !cell.marked && canMark && {
                    repeat: Infinity,
                    duration: 2,
                  })
                }}
                whileHover={isMarkable ? { scale: 1.1, rotate: [0, -2, 2, 0] } : {}}
                whileTap={isMarkable ? { scale: 0.95 } : {}}
              >
                {/* Indicador visual de categoría actual */}
                {isCurrentCategory && !cell.marked && canMark && (
                  <div className="absolute inset-0 flex items-center justify-center bg-purple-500/10 backdrop-blur-sm rounded-lg border-2 border-purple-400 border-dashed">
                    <span className="text-white text-xs font-bold">¡Marca aquí!</span>
                  </div>
                )}

                {/* Checkmark cuando está marcada */}
                {cell.marked && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      <Check
                        className="text-green-400 w-6 md:w-10 h-6 md:h-10"
                        style={{ filter: 'drop-shadow(0 0 8px rgb(74 222 128 / 0.5))' }}
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