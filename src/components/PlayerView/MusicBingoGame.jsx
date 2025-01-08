import { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Alert, AlertDescription } from "../ui/alert";

const CATEGORIES_A = [
  { name: 'Grupo o solista', color: 'bg-green-200', icon: '🎸' },
  { name: '¿Anterior al 2000?', color: 'bg-pink-200', icon: '20' },
  { name: '4 años arriba o abajo', color: 'bg-yellow-200', icon: '4' },
  { name: 'Década', color: 'bg-purple-200', icon: '0s' },
  { name: '2 años arriba o abajo', color: 'bg-blue-200', icon: '2' }
];

const CATEGORIES_B = [
  { name: 'Título de la canción', color: 'bg-green-200', icon: '🎵' },
  { name: 'Año exacto', color: 'bg-pink-200', icon: '📅' },
  { name: 'Nombre del grupo o solista', color: 'bg-yellow-200', icon: '🎤' },
  { name: 'Década', color: 'bg-purple-200', icon: '0s' },
  { name: '3 años arriba o abajo', color: 'bg-blue-200', icon: '3' }
];

const BingoBoard = () => {
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [hasWinner, setHasWinner] = useState(false);
  
  const validateLine = useCallback((line) => {
    const categoryCounts = {};
    line.forEach(cell => {
      categoryCounts[cell.name] = (categoryCounts[cell.name] || 0) + 1;
    });
    
    const hasMoreThanTwoRepeats = Object.values(categoryCounts).some(count => count > 2);
    const differentCategories = Object.keys(categoryCounts).length;
    
    return !hasMoreThanTwoRepeats && differentCategories >= 3;
  }, []);

  const generateBoard = useCallback(() => {
    const BOARD_SIZE = 5;
    const currentCategories = isExpertMode ? CATEGORIES_B : CATEGORIES_A;
    
    let validBoard;
    let attempts = 0;
    const MAX_ATTEMPTS = 1000;

    do {
      attempts++;
      validBoard = true;
      const newBoard = Array(BOARD_SIZE * BOARD_SIZE).fill(null).map(() => ({
        ...currentCategories[Math.floor(Math.random() * currentCategories.length)],
        marked: false
      }));

      // Verificar filas
      for (let i = 0; i < BOARD_SIZE; i++) {
        const row = newBoard.slice(i * BOARD_SIZE, (i + 1) * BOARD_SIZE);
        if (!validateLine(row)) {
          validBoard = false;
          break;
        }
      }

      // Verificar columnas
      if (validBoard) {
        for (let i = 0; i < BOARD_SIZE; i++) {
          const column = Array(BOARD_SIZE).fill(0).map((_, j) => newBoard[j * BOARD_SIZE + i]);
          if (!validateLine(column)) {
            validBoard = false;
            break;
          }
        }
      }

      // Verificar diagonales
      if (validBoard) {
        const diagonal1 = Array(BOARD_SIZE).fill(0).map((_, i) => newBoard[i * BOARD_SIZE + i]);
        const diagonal2 = Array(BOARD_SIZE).fill(0).map((_, i) => newBoard[i * BOARD_SIZE + (BOARD_SIZE - 1 - i)]);
        
        if (!validateLine(diagonal1) || !validateLine(diagonal2)) {
          validBoard = false;
        }
      }

      if (validBoard || attempts >= MAX_ATTEMPTS) return newBoard;
    } while (!validBoard);
  }, [isExpertMode, validateLine]);

  const [board, setBoard] = useState(() => generateBoard());

  useEffect(() => {
    const newBoard = generateBoard();
    setBoard(newBoard);
    setHasWinner(false);
  }, [isExpertMode, generateBoard]);

  const checkWinner = useCallback((newBoard) => {
    const BOARD_SIZE = 5;
    
    // Verificar filas
    for (let i = 0; i < BOARD_SIZE; i++) {
      const row = newBoard.slice(i * BOARD_SIZE, (i + 1) * BOARD_SIZE);
      if (row.every(cell => cell.marked)) return true;
    }

    // Verificar columnas
    for (let i = 0; i < BOARD_SIZE; i++) {
      const column = Array(BOARD_SIZE).fill(0).map((_, j) => newBoard[j * BOARD_SIZE + i]);
      if (column.every(cell => cell.marked)) return true;
    }

    // Verificar diagonales
    const diagonal1 = Array(BOARD_SIZE).fill(0).map((_, i) => newBoard[i * BOARD_SIZE + i]);
    const diagonal2 = Array(BOARD_SIZE).fill(0).map((_, i) => newBoard[i * BOARD_SIZE + (BOARD_SIZE - 1 - i)]);
    
    if (diagonal1.every(cell => cell.marked) || diagonal2.every(cell => cell.marked)) return true;

    return false;
  }, []);

  const toggleCell = useCallback((index) => {
    const newBoard = [...board];
    newBoard[index] = { ...newBoard[index], marked: !newBoard[index].marked };
    setBoard(newBoard);

    if (checkWinner(newBoard)) {
      setHasWinner(true);
    }
  }, [board, checkWinner]);

  return (
    <div className="max-w-2xl mx-auto p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-2">
        <h2 className="text-lg sm:text-xl font-bold">Tu Tablero de Bingo Musical</h2>
        <div className="flex items-center gap-2">
          <span className={`text-sm sm:text-base ${!isExpertMode ? "font-bold" : "text-gray-500"}`}>
            Principiantes
          </span>
          <Switch 
            checked={isExpertMode}
            onCheckedChange={setIsExpertMode}
          />
          <span className={`text-sm sm:text-base ${isExpertMode ? "font-bold" : "text-gray-500"}`}>
            Expertos
          </span>
        </div>
      </div>

      {hasWinner && (
        <Alert className="mb-2 sm:mb-4 bg-green-100">
          <AlertDescription>
            ¡BINGO! ¡Has completado una línea!
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-2 sm:p-4 mb-4 sm:mb-6">
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {board.map((category, index) => (
            <div
              key={index}
              className={`
                ${category.color} 
                aspect-square 
                rounded-lg 
                flex 
                flex-col 
                items-center 
                justify-center 
                p-1 
                sm:p-2 
                text-center 
                text-xs 
                sm:text-sm 
                border 
                border-gray-300 
                cursor-pointer 
                hover:opacity-90 
                relative 
                transition-all 
                duration-200 
                ${category.marked ? 'scale-95' : ''}
              `}
              onClick={() => toggleCell(index)}
            >
              <span className="text-base sm:text-lg mb-0.5 sm:mb-1">{category.icon}</span>
              <span className="text-[10px] sm:text-xs leading-tight">{category.name}</span>
              {category.marked && (
                <div className="absolute inset-0 flex items-center justify-center text-2xl sm:text-4xl font-bold text-red-500">
                  X
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-2 sm:space-y-4">
        <Input
          value={currentAnswer}
          onChange={(e) => setCurrentAnswer(e.target.value)}
          placeholder="Escribe tu respuesta aquí..."
          className="w-full text-sm sm:text-base"
        />
        <Button 
          onClick={() => setCurrentAnswer('')}
          className="w-full text-sm sm:text-base"
        >
          Enviar Respuesta
        </Button>
      </div>

      <div className="mt-4 sm:mt-6">
        <h3 className="text-base sm:text-lg font-semibold mb-2">
          Categorías {isExpertMode ? "Expertos" : "Principiantes"}
        </h3>
        <div className="space-y-1 sm:space-y-2">
          {(isExpertMode ? CATEGORIES_B : CATEGORIES_A).map((category, index) => (
            <div 
              key={index}
              className={`${category.color} p-2 rounded-lg flex items-center gap-2 text-sm sm:text-base`}
            >
              <span className="text-base sm:text-lg">{category.icon}</span>
              <span>{category.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MusicBingoGame = () => {
  return (
    <div className="p-4 sm:p-6">
      <div className="text-center mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Music Bingo</h1>
      </div>
      <BingoBoard />
    </div>
  );
};

export default MusicBingoGame;