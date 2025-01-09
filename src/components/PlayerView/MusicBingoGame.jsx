import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Alert, AlertDescription } from "../ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircleIcon, XCircleIcon } from "lucide-react";

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

const MusicBingoGame = () => {
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [hasWinner, setHasWinner] = useState(false);

  const validateLine = useMemo(() => (line) => {
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

    let board;
    let attempts = 0;
    const MAX_ATTEMPTS = 1000;

    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      let validBoard = true;
      board = Array(BOARD_SIZE * BOARD_SIZE).fill(null).map(() => ({
        ...currentCategories[Math.floor(Math.random() * currentCategories.length)],
        marked: false
      }));

      // Verificar filas
      for (let i = 0; i < BOARD_SIZE; i++) {
        const row = board.slice(i * BOARD_SIZE, (i + 1) * BOARD_SIZE);
        if (!validateLine(row)) {
          validBoard = false;
          break;
        }
      }

      // Verificar columnas
      if (validBoard) {
        for (let i = 0; i < BOARD_SIZE; i++) {
          const column = Array(BOARD_SIZE).fill(0).map((_, j) => board[j * BOARD_SIZE + i]);
          if (!validateLine(column)) {
            validBoard = false;
            break;
          }
        }
      }

      // Verificar diagonales
      if (validBoard) {
        const diagonal1 = Array(BOARD_SIZE).fill(0).map((_, i) => board[i * BOARD_SIZE + i]);
        const diagonal2 = Array(BOARD_SIZE).fill(0).map((_, i) => board[i * BOARD_SIZE + (BOARD_SIZE - 1 - i)]);

        if (!validateLine(diagonal1) || !validateLine(diagonal2)) {
          validBoard = false;
        }
      }

      if (validBoard) {
        return board;
      }
    }

    // Fallback: devolver un tablero generado sin validación estricta si se agotan los intentos
    return Array(BOARD_SIZE * BOARD_SIZE).fill(null).map(() => ({
      ...currentCategories[Math.floor(Math.random() * currentCategories.length)],
      marked: false
    }));
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
          <h1 className="text-3xl font-bold text-center text-white drop-shadow-md">
            Music Bingo
          </h1>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className={`text-base ${!isExpertMode ? "font-bold text-purple-600" : "text-gray-500"}`}>
                Principiantes
              </span>
              <Switch
                checked={isExpertMode}
                onCheckedChange={setIsExpertMode}
              />
              <span className={`text-base ${isExpertMode ? "font-bold text-purple-600" : "text-gray-500"}`}>
                Expertos
              </span>
            </div>
          </div>

          <AnimatePresence>
            {hasWinner && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-4"
              >
                <Alert className="bg-green-100 border-green-300">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                  <AlertDescription className="text-green-800 font-semibold">
                    ¡BINGO! ¡Has completado una línea!
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="p-4 mb-6 shadow-lg">
            <div className="grid grid-cols-5 gap-2">
              {board.map((category, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    ${category.color} 
                    aspect-square 
                    rounded-xl 
                    flex 
                    flex-col 
                    items-center 
                    justify-center 
                    p-2 
                    text-center 
                    cursor-pointer 
                    hover:opacity-90 
                    relative 
                    transition-all 
                    duration-200 
                    ${category.marked ? 'scale-95 shadow-inner' : 'shadow-md'}
                  `}
                  onClick={() => toggleCell(index)}
                >
                  <span className="text-2xl mb-1">{category.icon}</span>
                  <span className="text-xs leading-tight">{category.name}</span>
                  {category.marked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <XCircleIcon className="text-red-500 w-12 h-12" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Input
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Escribe tu respuesta aquí..."
              className="w-full text-base"
            />
            <Button
              onClick={() => setCurrentAnswer('')}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
            >
              Enviar Respuesta
            </Button>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">
              Categorías {isExpertMode ? "Expertos" : "Principiantes"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {(isExpertMode ? CATEGORIES_B : CATEGORIES_A).map((category, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${category.color} p-3 rounded-lg flex items-center gap-3 shadow-md`}
                >
                  <span className="text-2xl">{category.icon}</span>
                  <span className="text-sm font-medium">{category.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MusicBingoGame;