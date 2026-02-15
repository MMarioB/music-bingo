import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Card } from '../ui/card';
import { Check } from 'lucide-react';

// Estilos estáticos
const checkStyle = { filter: 'drop-shadow(0 0 8px rgb(74 222 128 / 0.5))' };

const BingoBoard = ({ board, currentCategory, currentSong, canMark, onCellClick }) => {

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
              <button
                key={index}
                className={`
                  ${cell.color} aspect-square rounded-lg flex items-center justify-center p-1 md:p-2
                  text-center relative transition-all duration-200 border
                  ${isMarkable
                    ? 'cursor-pointer hover:ring-2 hover:ring-purple-400 border-purple-400 hover:scale-110'
                    : isCurrentCategory
                      ? 'cursor-not-allowed border-purple-400 opacity-50'
                      : 'cursor-default border-white/20'
                  }
                  ${cell.marked ? 'scale-95 shadow-inner' : 'shadow hover:shadow-md'}
                  ${shouldPulse ? 'bingo-cell-pulse' : ''}
                `}
                onClick={() => handleCellClick(index, cell.name)}
                disabled={!isMarkable}
                aria-label={`Casilla ${cell.name} ${cell.marked ? '(marcada)' : ''}`}
                title={`${cell.name}${isCurrentCategory ? ' - Categoría actual' : ''}${cell.marked ? ' ✓' : ''}`}
              >
                {shouldPulse && (
                  <div className="absolute inset-0 flex items-center justify-center bg-purple-500/10 backdrop-blur-sm rounded-lg border-2 border-purple-400 border-dashed">
                    <span className="text-white text-xs font-bold">¡Marca aquí!</span>
                  </div>
                )}

                {cell.marked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg animate-checkIn">
                    <div className="animate-checkBounce">
                      <Check
                        className="text-green-400 w-6 md:w-10 h-6 md:h-10"
                        style={checkStyle}
                      />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <style>{`
        @keyframes bingoCellPulse {
          0%, 100% {
            box-shadow: 0 0 0px rgba(168, 85, 247, 0);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
            transform: scale(1.05);
          }
        }
        .bingo-cell-pulse { animation: bingoCellPulse 2s infinite; }
        @keyframes checkIn {
          from { transform: scale(0) rotate(-180deg); }
          to { transform: scale(1) rotate(0deg); }
        }
        .animate-checkIn { animation: checkIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        @keyframes checkBounce {
          0% { transform: scale(0); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .animate-checkBounce { animation: checkBounce 0.5s ease-out forwards; }
      `}</style>
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
