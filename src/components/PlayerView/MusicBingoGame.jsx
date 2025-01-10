import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Alert, AlertDescription } from "../ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircleIcon, 
  XCircleIcon,
  Users,
  Clock,
  Target,
  Calendar,
  Music,
  Mic2
} from "lucide-react";

// Números personalizados
const Number2Icon = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M8 7a4 4 0 0 1 8 0v1a4 4 0 0 1-4 4H8" />
        <line x1="8" y1="16" x2="16" y2="16" />
    </svg>
);

const Number3Icon = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M8 7a4 4 0 0 1 8 0v10a4 4 0 0 1-8 0" />
        <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
);

const Number4Icon = (props) => (
  <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
  >
      <path d="M8 4v8h8" />
      <line x1="16" y1="4" x2="16" y2="20" />
  </svg>
);

const CATEGORIES_A = [
  { 
    name: 'Grupo o solista', 
    color: 'bg-green-200', 
    icon: Users,
    iconProps: { 
      size: 24, 
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    } 
  },
  { 
    name: '¿Anterior al 2000?', 
    color: 'bg-pink-200', 
    icon: Clock,
    iconProps: { 
      size: 24, 
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    } 
  },
  { 
    name: '4 años arriba o abajo', 
    color: 'bg-yellow-200', 
    icon: Number4Icon,
    iconProps: { 
      size: 24, 
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    } 
  },
  { 
    name: 'Década', 
    color: 'bg-purple-200', 
    icon: Calendar,
    iconProps: { 
      size: 24, 
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    } 
  },
  { 
    name: '2 años arriba o abajo', 
    color: 'bg-blue-200', 
    icon: Number2Icon,
    iconProps: { 
      size: 24, 
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    } 
  }
];

const CATEGORIES_B = [
  { 
    name: 'Título de la canción', 
    color: 'bg-green-200', 
    icon: Music,
    iconProps: { 
      size: 24, 
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    } 
  },
  { 
    name: 'Año exacto', 
    color: 'bg-pink-200', 
    icon: Target,
    iconProps: { 
      size: 24, 
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    } 
  },
  { 
    name: 'Nombre del grupo o solista', 
    color: 'bg-yellow-200', 
    icon: Mic2,
    iconProps: { 
      size: 24, 
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    } 
  },
  { 
    name: 'Década', 
    color: 'bg-purple-200', 
    icon: Calendar,
    iconProps: { 
      size: 24, 
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    } 
  },
  { 
    name: '3 años arriba o abajo', 
    color: 'bg-blue-200', 
    icon: Number3Icon,
    iconProps: { 
      size: 24, 
      className: 'text-gray-700',
      style: { filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }
    } 
  }
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
    const MAX_PER_CATEGORY = 5;
    const currentCategories = isExpertMode ? CATEGORIES_B : CATEGORIES_A;
  
    let board;
    let attempts = 0;
    const MAX_ATTEMPTS = 1000;
  
    while (attempts < MAX_ATTEMPTS) {
      attempts++;
  
      const categoryCounts = currentCategories.reduce((acc, category) => {
        acc[category.name] = 0;
        return acc;
      }, {});
  
      let validBoard = true;
      board = Array(BOARD_SIZE * BOARD_SIZE).fill(null).map(() => {
        let selectedCategory;
        do {
          selectedCategory = currentCategories[Math.floor(Math.random() * currentCategories.length)];
        } while (categoryCounts[selectedCategory.name] >= MAX_PER_CATEGORY);
  
        categoryCounts[selectedCategory.name]++;
  
        return {
          ...selectedCategory,
          marked: false
        };
      });
  
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 p-3 md:p-6 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl bg-white/80 backdrop-blur-lg rounded-xl shadow-xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 md:p-6">
          <h1 className="text-xl md:text-3xl font-bold text-center text-white drop-shadow-md">
            Music Bingo
          </h1>
        </div>

        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center justify-center gap-3 md:gap-4">
              <span className={`text-sm md:text-base ${!isExpertMode ? "font-bold text-purple-600" : "text-gray-500"}`}>
                Principiantes
              </span>
              <Switch
                checked={isExpertMode}
                onCheckedChange={setIsExpertMode}
                className="data-[state=checked]:bg-purple-600"
              />
              <span className={`text-sm md:text-base ${isExpertMode ? "font-bold text-purple-600" : "text-gray-500"}`}>
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
              >
                <Alert className="bg-green-100 border-green-300">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                  <AlertDescription className="text-green-800 font-semibold text-sm md:text-base">
                    ¡BINGO! ¡Has completado una línea!
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="p-2 md:p-4 shadow-lg">
            <div className="grid grid-cols-5 gap-1 md:gap-3">
              {board.map((category, index) => {
                const Icon = category.icon;
                return (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      ${category.color} 
                      aspect-square 
                      rounded-lg
                      flex 
                      items-center 
                      justify-center 
                      p-1 md:p-2
                      text-center 
                      relative 
                      transition-all 
                      duration-200
                      focus:outline-none
                      focus:ring-2
                      focus:ring-purple-400
                      focus:ring-offset-2
                      ${category.marked ? 'scale-95 shadow-inner' : 'shadow hover:shadow-md'}
                    `}
                    onClick={() => toggleCell(index)}
                    aria-label={`Casilla ${category.name}`}
                  >
                    <Icon {...category.iconProps} />
                    {category.marked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                        <XCircleIcon className="text-red-500 w-6 md:w-10 h-6 md:h-10" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </Card>

          <div className="space-y-3">
            <Input
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Escribe tu respuesta aquí..."
              className="w-full text-sm md:text-base"
              aria-label="Respuesta"
            />
            <Button
              onClick={() => setCurrentAnswer('')}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 py-2 md:py-3"
            >
              Enviar Respuesta
            </Button>
          </div>

          <div className="mt-6">
            <h3 className="text-base md:text-lg font-semibold mb-3">
              Categorías {isExpertMode ? "Expertos" : "Principiantes"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {(isExpertMode ? CATEGORIES_B : CATEGORIES_A).map((category, index) => {
                const Icon = category.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`${category.color} p-2 md:p-3 rounded-lg flex items-center gap-2 shadow-sm`}
                  >
                    <Icon {...category.iconProps} />
                    <span className="text-xs md:text-sm font-medium">{category.name}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MusicBingoGame;