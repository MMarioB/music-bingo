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

const easeOutQuad = (t) => t * (2 - t); // Función de easing para ralentizar la animación

const CategoryWheel = ({ difficulty = 'principiante', onCategorySelected = () => { } }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [finalSelectedCategory, setFinalSelectedCategory] = useState(null);

    const categories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;

    const spinWheel = () => {
        if (isSpinning) return;
    
        setIsSpinning(true);
        setFinalSelectedCategory(null);
    
        const duration = 3500; // Duración total de la animación
        const startTime = Date.now();
        const totalSpins = 10; // Número de vueltas completas antes de detenerse
    
        // Índice inicial aleatorio
        const initialIndex = Math.floor(Math.random() * categories.length);
        setHighlightedIndex(initialIndex);
    
        const animateSpin = () => {
            const currentTime = Date.now();
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1); // Progreso entre 0 y 1
    
            const easedProgress = easeOutQuad(progress);
            const totalSteps = totalSpins * categories.length + Math.floor(easedProgress * categories.length);
    
            // Calculamos el índice actual basado en el progreso
            const currentIndex = (initialIndex + totalSteps) % categories.length;
            setHighlightedIndex(currentIndex);
    
            if (progress < 1) {
                requestAnimationFrame(animateSpin);
            } else {
                // Al final, seleccionamos la categoría final
                const finalCategory = categories[currentIndex];
                setFinalSelectedCategory(finalCategory);
                setIsSpinning(false);
    
                // Espera 2 segundos antes de notificar la selección y cambiar de vista
                setTimeout(() => {
                    onCategorySelected(finalCategory); // Llama a la función para avanzar
                }, 2000); // 2000 ms = 2 segundos
            }
        };
    
        animateSpin();
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
                        className={`transition-opacity duration-300 ${
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
                        className={`transition-transform duration-300 ${
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
