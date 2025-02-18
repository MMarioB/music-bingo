import { useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { CATEGORIES_A, CATEGORIES_B } from './constants';

const easeOutQuad = (t) => t * (2 - t);

const CategoryWheel = ({ difficulty = 'principiante', onCategorySelected = () => {} }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [finalSelectedCategory, setFinalSelectedCategory] = useState(null);

    const categories = difficulty === 'principiante' ? CATEGORIES_A : CATEGORIES_B;

    const createNeonFilter = () => (
        <defs>
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

            <radialGradient id="segmentGradient">
                <stop offset="0%" stopColor="rgba(255,255,255,0.1)"/>
                <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
            </radialGradient>
        </defs>
    );

    const generateWheelSegments = () => {
        return categories.map((category, index) => {
            const startAngle = index * (360 / categories.length);
            const endAngle = startAngle + (360 / categories.length);
            const midAngle = startAngle + (180 / categories.length);
    
            const radius = 0.85;
            const startX = Math.cos((startAngle - 90) * Math.PI / 180) * radius;
            const startY = Math.sin((startAngle - 90) * Math.PI / 180) * radius;
            const endX = Math.cos((endAngle - 90) * Math.PI / 180) * radius;
            const endY = Math.sin((endAngle - 90) * Math.PI / 180) * radius;
    
            const squarePosition = 0.55;
            const squareSize = 0.25;
            const textX = Math.cos((midAngle - 90) * Math.PI / 180) * squarePosition;
            const textY = Math.sin((midAngle - 90) * Math.PI / 180) * squarePosition;
    
            const largeArcFlag = "0";
            const pathData = `M 0 0 L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
    
            const isHighlighted = index === highlightedIndex;
            const isSelected = category === finalSelectedCategory;
            const Icon = category.icon;
    
            return (
                <g key={index} className="transition-all duration-300">
                    <path
                        d={pathData}
                        fill="transparent"
                        stroke={category.neonColor}
                        strokeWidth="0.005"
                        className={`transition-opacity duration-300 ${
                            isHighlighted || isSelected ? 'opacity-100' : 'opacity-50'
                        }`}
                    />
    
                    <g transform={`translate(${textX}, ${textY})`}>
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
                        
                        <g 
                            transform={`translate(${-squareSize/4}, ${-squareSize/4}) scale(0.01)`}
                            style={{
                                transformBox: 'fill-box',
                                transformOrigin: 'center'
                            }}
                        >
                            <Icon 
                                size={48}
                                {...category.iconProps}
                                style={{
                                    ...category.iconProps.style,
                                    strokeWidth: '2',
                                }}
                            />
                        </g>
                    </g>
                </g>
            );
        });
    };

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

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Header con categoría seleccionada */}
            {finalSelectedCategory && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${finalSelectedCategory.color} p-3 rounded-lg text-center border border-white/20 mb-4`}
                    style={{ boxShadow: '0 0 15px rgba(255,255,255,0.1)' }}
                >
                    <h3 className="font-semibold text-gray-800 flex items-center justify-center gap-2">
                        <finalSelectedCategory.icon className="w-5 h-5" />
                        {finalSelectedCategory.name}
                    </h3>
                </motion.div>
            )}

            {/* Contenedor de la ruleta optimizado */}
            <div className="relative aspect-square w-full mx-auto bg-black/20 rounded-xl border border-white/10 p-4">
                <svg
                    viewBox="-1.1 -1.1 2.2 2.2"
                    className="w-full h-full"
                >
                    {createNeonFilter()}
                    {generateWheelSegments()}
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

                {/* Botón superpuesto en la parte inferior */}
                <motion.button
                    onClick={spinWheel}
                    disabled={isSpinning}
                    className="absolute bottom-6 left-1/2 transform -translate-x-1/2 px-8 py-3 rounded-full bg-gradient-to-r from-purple-600/90 to-pink-600/90 text-white font-bold border border-white/20 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
                    style={{
                        boxShadow: '0 0 20px rgba(168,85,247,0.4)'
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {/* Fondo animado */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity" />
                    
                    {/* Partículas de nota musical */}
                    <div className="absolute inset-0 overflow-hidden">
                        {isSpinning && Array.from({ length: 3 }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ 
                                    opacity: 0.8,
                                    scale: 1,
                                    x: '50%',
                                    y: '100%'
                                }}
                                animate={{
                                    opacity: 0,
                                    scale: 0,
                                    x: [null, `${50 + (i-1)*30}%`],
                                    y: '-100%'
                                }}
                                transition={{
                                    duration: 1,
                                    delay: i * 0.2,
                                    repeat: Infinity
                                }}
                                className="absolute w-4 h-4 text-white"
                            >
                                ♪
                            </motion.div>
                        ))}
                    </div>

                    {/* Texto e icono */}
                    <div className="flex items-center justify-center gap-2 relative">
                        <span className="relative z-10">
                            {isSpinning ? "Girando..." : "Girar Ruleta"}
                        </span>
                        {!isSpinning && (
                            <motion.span
                                animate={{
                                    rotate: [0, -10, 10, -10, 10, 0]
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    repeatDelay: 1
                                }}
                            >
                                🎵
                            </motion.span>
                        )}
                    </div>
                </motion.button>
            </div>

            {/* Lista de jugadores y controles */}
            <div className="mt-6 bg-black/20 rounded-xl border border-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-white">
                        Jugadores Conectados
                    </h3>
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-white/80">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">3</span>
                    </div>
                </div>
                <div className="space-y-2">
                    {/* ... contenido de jugadores ... */}
                </div>
            </div>
        </div>
    );
};

CategoryWheel.propTypes = {
    difficulty: PropTypes.oneOf(['principiante', 'experto']),
    onCategorySelected: PropTypes.func
};

export default CategoryWheel;