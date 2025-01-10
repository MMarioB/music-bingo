import { useState } from 'react';
import { Button } from './ui/button';
import PropTypes from 'prop-types';

const WHEEL_COLORS = {
    blue: '#BFDBFE',
    purple: '#E9D5FF',
    pink: '#FBCFE8',
    yellow: '#FEF08A',
    green: '#BBF7D0'
};

const CATEGORIES_A = [
    { name: 'Grupo o solista', color: WHEEL_COLORS.green, icon: '🎸' },
    { name: '¿Anterior al 2000?', color: WHEEL_COLORS.pink, icon: '20' },
    { name: '4 años arriba o abajo', color: WHEEL_COLORS.yellow, icon: '4' },
    { name: 'Década', color: WHEEL_COLORS.purple, icon: '0s' },
    { name: '2 años arriba o abajo', color: WHEEL_COLORS.blue, icon: '2' }
];

const CATEGORIES_B = [
    { name: 'Título de la canción', color: WHEEL_COLORS.green, icon: '🎵' },
    { name: 'Año exacto', color: WHEEL_COLORS.pink, icon: '📅' },
    { name: 'Nombre del grupo o solista', color: WHEEL_COLORS.yellow, icon: '🎤' },
    { name: 'Década', color: WHEEL_COLORS.purple, icon: '0s' },
    { name: '3 años arriba o abajo', color: WHEEL_COLORS.blue, icon: '3' }
];

const CategoryWheel = ({ difficulty = 'principiante', onCategorySelected = () => { } }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const baseCategories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;
    const categories = [...baseCategories, ...baseCategories];

    const spinWheel = () => {
        if (isSpinning) return;

        setIsSpinning(true);
        let currentIndex = 0;
        let speed = 100;
        let cycles = 0;
        const maxCycles = 20;

        // Generar un índice aleatorio para la categoría final
        const finalCategoryIndex = Math.floor(Math.random() * baseCategories.length);

        const tick = () => {
            setHighlightedIndex(currentIndex);
            currentIndex = (currentIndex + 1) % categories.length;
            cycles++;

            if (cycles > maxCycles) {
                speed *= 1.2;
                if (speed > 500) {
                    // Detener la animación
                    setIsSpinning(false);
                    setHighlightedIndex(-1);

                    // Seleccionar la categoría final
                    const selectedCat = baseCategories[finalCategoryIndex];
                    setSelectedCategory(selectedCat);
                    onCategorySelected(selectedCat);

                    return;
                }
            }
        };

        // Iniciar intervalos de animación
        const intervalId = setInterval(tick, speed);
        
        // Limpiar el intervalo después de un tiempo máximo
        setTimeout(() => {
            clearInterval(intervalId);
            setIsSpinning(false);
            setHighlightedIndex(-1);
        }, 3000);
    };

    const generateWheelSegments = () => {
        return categories.map((category, index) => {
            const startAngle = index * 36;
            const endAngle = startAngle + 36;
            const midAngle = startAngle + 18;

            const startX = Math.cos((startAngle - 90) * Math.PI / 180);
            const startY = Math.sin((startAngle - 90) * Math.PI / 180);
            const endX = Math.cos((endAngle - 90) * Math.PI / 180);
            const endY = Math.sin((endAngle - 90) * Math.PI / 180);

            const textX = Math.cos((midAngle - 90) * Math.PI / 180) * 0.7;
            const textY = Math.sin((midAngle - 90) * Math.PI / 180) * 0.7;

            const largeArcFlag = "0";

            const pathData = `M 0 0 
                            L ${startX} ${startY} 
                            A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} 
                            Z`;

            const isHighlighted = index === highlightedIndex;

            return (
                <g key={index}>
                    <path
                        d={pathData}
                        fill={category.color}
                        stroke="white"
                        strokeWidth="0.01"
                        className={`transition-opacity duration-100 ${
                            isHighlighted ? 'opacity-100' : 'opacity-50'
                        }`}
                    />
                    <text
                        x={textX}
                        y={textY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="black"
                        fontSize="0.15"
                        transform={`rotate(${midAngle}, ${textX}, ${textY})`}
                        className={`transition-transform duration-100 ${
                            isHighlighted ? 'scale-110' : 'scale-100'
                        }`}
                    >
                        {category.icon}
                    </text>
                </g>
            );
        });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="relative w-full max-w-xl aspect-square">
                {/* Marcador */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-transparent border-t-black"></div>
                </div>

                {/* SVG Ruleta */}
                <svg
                    viewBox="-1.1 -1.1 2.2 2.2"
                    className="w-full h-full"
                    style={{ transform: 'rotate(-90deg)' }}
                >
                    {generateWheelSegments()}
                    {/* Centro de la ruleta */}
                    <circle r="0.15" fill="white" />
                </svg>
            </div>

            <Button
                onClick={spinWheel}
                disabled={isSpinning}
                className="mt-8 px-8 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full"
            >
                {isSpinning ? "Girando..." : "Girar Ruleta"}
            </Button>

            {selectedCategory && (
                <div className="mt-4 text-center">
                    <p className="text-xl font-bold">
                        Categoría seleccionada: {selectedCategory.name}
                    </p>
                </div>
            )}
        </div>
    );
};

CategoryWheel.propTypes = {
    difficulty: PropTypes.oneOf(['principiante', 'experto']),
    onCategorySelected: PropTypes.func
};

export default CategoryWheel;