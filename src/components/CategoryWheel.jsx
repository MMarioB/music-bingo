import { useState, useEffect } from 'react';
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
    const [finalSelectedCategory, setFinalSelectedCategory] = useState(null);

    const categories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;

    useEffect(() => {
        const timer = setTimeout(() => {
            setHighlightedIndex(-1);
        }, 3500);

        return () => clearTimeout(timer);
    }, [finalSelectedCategory]);

    const spinWheel = () => {
        if (isSpinning) return;

        setIsSpinning(true);
        setHighlightedIndex(-1);
        setFinalSelectedCategory(null);

        // Función para simular la iluminación de la ruleta
        const animateSpin = (currentIndex, startTime) => {
            const currentTime = Date.now();
            const elapsedTime = currentTime - startTime;

            if (elapsedTime >= 3500) {
                // Detener la animación y seleccionar la categoría
                const randomFinalIndex = Math.floor(Math.random() * categories.length);
                const finalCategory = categories[randomFinalIndex];
                setIsSpinning(false);
                setFinalSelectedCategory(finalCategory);
                onCategorySelected(finalCategory);
                return;
            }

            const highlightedIndex = Math.floor((currentIndex / 70) * categories.length);
            setHighlightedIndex(highlightedIndex);

            requestAnimationFrame(() => {
                animateSpin(currentIndex + 1, startTime);
            });
        };

        // Iniciar la animación
        animateSpin(0, Date.now());
    };

    const generateWheelSegments = () => {
        return categories.map((category, index) => {
            const startAngle = index * (360 / categories.length);
            const endAngle = startAngle + (360 / categories.length);
            const midAngle = startAngle + (180 / categories.length);

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
            const isSelected = category === finalSelectedCategory;

            return (
                <g key={index}>
                    <path
                        d={pathData}
                        fill={category.color}
                        stroke="white"
                        strokeWidth="0.01"
                        className={`transition-opacity duration-500 ${
                            isHighlighted || isSelected ? 'opacity-100' : 'opacity-50'
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
                        className={`transition-transform duration-500 ${
                            isHighlighted || isSelected ? 'scale-110' : 'scale-100'
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
                {/* SVG Ruleta */}
                <svg
                    viewBox="-1.1 -1.1 2.2 2.2"
                    className="w-full h-full"
                >
                    {generateWheelSegments()}
                    {/* Centro de la ruleta */}
                    <circle cx="0" cy="0" r="0.15" fill="white" />
                </svg>
            </div>

            <Button
                onClick={spinWheel}
                disabled={isSpinning}
                className="mt-8 px-8 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full"
            >
                {isSpinning ? "Girando..." : "Girar Ruleta"}
            </Button>

            {finalSelectedCategory && (
                <div className="mt-4 text-center">
                    <p className="text-xl font-bold">
                        Categoría seleccionada: {finalSelectedCategory.name}
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