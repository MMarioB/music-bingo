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

    // Función para generar el efecto de neón
    const createNeonFilter = () => (
        <defs>
            {/* Filtro para el efecto de resplandor neón */}
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
            {/* Gradiente radial para el fondo de los segmentos */}
            <radialGradient id="segmentGradient">
                <stop offset="0%" stopColor="rgba(255,255,255,0.2)"/>
                <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
            </radialGradient>
            {/* Definir patrones para la textura */}
            <pattern id="gridPattern" patternUnits="userSpaceOnUse" width="10" height="10">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
            </pattern>
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

            const radius = 0.85; // Aumentado para hacer los segmentos más grandes
            const textX = Math.cos((midAngle - 90) * Math.PI / 180) * (radius * 0.6);
            const textY = Math.sin((midAngle - 90) * Math.PI / 180) * (radius * 0.6);

            const largeArcFlag = "0";
            const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

            const isHighlighted = index === highlightedIndex;
            const isSelected = category === finalSelectedCategory;
            const Icon = category.icon;

            // Calcular el color de neón basado en la categoría
            const neonColor = category.neonColor || '#fff';
            
            return (
                <g key={index} className="transition-all duration-300">
                    {/* Segmento base con gradiente */}
                    <path
                        d={pathData}
                        fill={`url(#segmentGradient)`}
                        stroke={neonColor}
                        strokeWidth="0.01"
                        style={{
                            filter: isHighlighted || isSelected ? 'url(#neonGlow)' : 'none',
                            opacity: isHighlighted || isSelected ? 1 : 0.7
                        }}
                    />
                    {/* Patrón de cuadrícula sobre el segmento */}
                    <path
                        d={pathData}
                        fill="url(#gridPattern)"
                        style={{ opacity: 0.3 }}
                    />
                    {/* Cuadrado neón para el ícono */}
                    <g transform={`translate(${textX}, ${textY})`}>
                        <rect
                            x="-0.15"
                            y="-0.15"
                            width="0.3"
                            height="0.3"
                            fill={isHighlighted || isSelected ? category.color : 'rgba(255,255,255,0.1)'}
                            stroke={neonColor}
                            strokeWidth="0.01"
                            style={{
                                filter: isHighlighted || isSelected ? 'url(#neonGlow)' : 'none'
                            }}
                        />
                        {/* Ícono */}
                        <g transform={`rotate(${midAngle})`}>
                            <g transform="scale(0.007)">
                                <Icon 
                                    {...category.iconProps}
                                    style={{
                                        ...category.iconProps.style,
                                        strokeWidth: '2.5',
                                        filter: isHighlighted || isSelected ? 'url(#neonGlow)' : 'none'
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
        <div className="flex flex-col items-center justify-center min-h-screen p-2 bg-[#1a0133]">
            <div className="relative w-full max-w-xl aspect-square">
                <svg
                    viewBox="-1.1 -1.1 2.2 2.2"
                    className="w-full h-full"
                    style={{
                        filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))'
                    }}
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