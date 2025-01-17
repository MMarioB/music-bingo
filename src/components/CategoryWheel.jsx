import { useState } from 'react';
import { Button } from './ui/button';
import PropTypes from 'prop-types';
import { CATEGORIES_A, CATEGORIES_B } from './constants';

const easeOutQuad = (t) => t * (2 - t);

const CategoryWheel = ({ difficulty = 'principiante', onCategorySelected = () => {} }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [finalSelectedCategory, setFinalSelectedCategory] = useState(null);

    const categories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;

    const createNeonFilter = () => (
        <defs>
            {/* Filtro para el efecto de resplandor neón */}
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feFlood result="floodBlur" floodOpacity="0.5" floodColor="white"/>
                <feComposite in="floodBlur" in2="SourceAlpha" operator="in" result="compositeBlur"/>
                <feGaussianBlur in="compositeBlur" stdDeviation="3" result="blur"/>
                <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>

            {/* Gradiente radial para el fondo de los segmentos */}
            <radialGradient id="segmentGradient">
                <stop offset="0%" stopColor="rgba(255,255,255,0.1)"/>
                <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
            </radialGradient>
        </defs>
    );

    const spinWheel = () => {
        if (isSpinning) return;
    
        setIsSpinning(true);
        setFinalSelectedCategory(null);
    
        const duration = 3500;
        const startTime = Date.now();
    
        const totalSegments = categories.length;
        const randomSpins = Math.floor(Math.random() * (20 - 10 + 1)) + 10;
        const totalSteps = randomSpins * totalSegments;
    
        const initialIndex = Math.floor(Math.random() * totalSegments);
        setHighlightedIndex(initialIndex);
    
        const animateSpin = () => {
            const currentTime = Date.now();
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
    
            const easedProgress = easeOutQuad(progress);
            const currentStep = Math.floor(easedProgress * totalSteps);
            const currentIndex = (initialIndex + currentStep) % totalSegments;
    
            setHighlightedIndex(currentIndex);
    
            if (progress < 1) {
                requestAnimationFrame(animateSpin);
            } else {
                const finalIndex = (initialIndex + totalSteps) % totalSegments;
                const finalCategory = categories[finalIndex];
                setFinalSelectedCategory(finalCategory);
                setIsSpinning(false);
    
                setTimeout(() => {
                    onCategorySelected(finalCategory);
                }, 2000);
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

            const squarePosition = 0.55; // Posición del cuadrado desde el centro
            const squareSize = 0.25; // Tamaño del cuadrado
            const textX = Math.cos((midAngle - 90) * Math.PI / 180) * squarePosition;
            const textY = Math.sin((midAngle - 90) * Math.PI / 180) * squarePosition;

            const largeArcFlag = "0";
            const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

            const isHighlighted = index === highlightedIndex;
            const isSelected = category === finalSelectedCategory;
            const Icon = category.icon;

            return (
                <g key={index} className="transition-all duration-300">
                    {/* Segmento base con borde neón */}
                    <path
                        d={pathData}
                        fill="transparent"
                        stroke={category.neonColor}
                        strokeWidth="0.003"
                        className={`transition-opacity duration-300 ${
                            isHighlighted || isSelected ? 'opacity-100' : 'opacity-50'
                        }`}
                    />

                    {/* Cuadrado con icono */}
                    <g transform={`translate(${textX}, ${textY})`}>
                        {/* Fondo del cuadrado */}
                        <rect
                            x={-squareSize/2}
                            y={-squareSize/2}
                            width={squareSize}
                            height={squareSize}
                            fill={category.wheelColor}
                            stroke={category.neonColor}
                            strokeWidth="0.005"
                            rx="0.02"
                            ry="0.02"
                            className={`transition-all duration-300 ${
                                isHighlighted || isSelected ? 'opacity-100' : 'opacity-70'
                            }`}
                            style={{
                                filter: isHighlighted || isSelected ? 'url(#neonGlow)' : 'none'
                            }}
                        />
                        
                        {/* Icono centrado */}
                        <g transform="scale(0.008)">
                            <g transform={`translate(-16, -16)`}>
                                <Icon 
                                    {...category.iconProps}
                                    style={{
                                        ...category.iconProps.style,
                                        strokeWidth: '2.5',
                                    }}
                                />
                            </g>
                        </g>
                    </g>
                </g>
            );
        });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-2">
            <div className="relative w-full max-w-xl aspect-square">
                <svg
                    viewBox="-1.1 -1.1 2.2 2.2"
                    className="w-full h-full"
                >
                    {createNeonFilter()}
                    {generateWheelSegments()}
                    {/* Centro de la ruleta con efecto neón */}
                    <circle 
                        cx="0" 
                        cy="0" 
                        r="0.15" 
                        fill="white"
                        style={{
                            filter: 'url(#neonGlow)'
                        }}
                    />
                </svg>
            </div>

            <Button
                onClick={spinWheel}
                disabled={isSpinning}
                className="mt-8 px-8 py-4 bg-purple-600/80 hover:bg-purple-700/80 text-white rounded-full border border-purple-400 transition-all duration-300 backdrop-blur-sm"
                style={{
                    boxShadow: '0 0 20px rgba(168,85,247,0.4)'
                }}
            >
                {isSpinning ? "Girando..." : "Girar Ruleta"}
            </Button>

            {finalSelectedCategory && (
                <div className="mt-4 text-center text-white">
                    <p className="text-xl font-bold"
                       style={{
                           textShadow: '0 0 10px rgba(255,255,255,0.5)'
                       }}>
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