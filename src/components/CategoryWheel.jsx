import { useState } from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { CATEGORIES_A, CATEGORIES_B } from './constants';

const CategoryWheel = ({ difficulty, onCategorySelected }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  const categories = difficulty === 'experto' ? CATEGORIES_B : CATEGORIES_A;
  const numSlices = categories.length;
  const sliceAngle = 360 / numSlices;

  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    const spins = 5; // Número de vueltas completas
    const extraDegrees = Math.random() * 360; // Grados adicionales aleatorios
    const totalRotation = spins * 360 + extraDegrees;
    
    setRotation(prevRotation => prevRotation + totalRotation);

    // Calcular la categoría seleccionada
    setTimeout(() => {
      const finalAngle = extraDegrees;
      const selectedIndex = Math.floor(((360 - (finalAngle % 360)) % 360) / sliceAngle);
      onCategorySelected(categories[selectedIndex]);
      setIsSpinning(false);
    }, 3000);
  };

  return (
    <div className="mt-2 flex flex-col items-center">
      <div className="relative w-[280px] h-[280px]">
        <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: 3, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {categories.map((category, index) => {
            const Icon = category.icon;
            const angle = (index * sliceAngle);
            const rotate = angle + sliceAngle / 2;

            return (
              <div
                key={category.name}
                className="absolute w-full h-full origin-center"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <div 
                  className={`absolute left-1/2 w-1/2 h-full ${category.color}`}
                  style={{ transformOrigin: 'left' }}
                />
                <div
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `rotate(${rotate}deg) translate(90px, -12px)`,
                  }}
                >
                  <Icon
                    className="text-gray-700"
                    style={{
                      transform: `rotate(-${rotate}deg)`,
                    }}
                    {...category.iconProps}
                  />
                </div>
              </div>
            );
          })}
          <div className="absolute top-1/2 left-1/2 w-4 h-4 -mt-2 -ml-2 bg-white rounded-full shadow-md" />
        </motion.div>
      </div>

      <button
        onClick={handleSpin}
        disabled={isSpinning}
        className={`
          mt-6 px-6 py-2 rounded-full text-white font-semibold
          transition-all duration-200
          ${isSpinning 
            ? 'bg-purple-400 cursor-not-allowed' 
            : 'bg-purple-600 hover:bg-purple-700 hover:shadow-lg'
          }
        `}
      >
        Girar Ruleta
      </button>
    </div>
  );
};

CategoryWheel.propTypes = {
  difficulty: PropTypes.oneOf(['principiante', 'experto']).isRequired,
  onCategorySelected: PropTypes.func.isRequired
};

export default CategoryWheel;