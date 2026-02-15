import { useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';

/**
 * Hook para efectos de confetti
 */
export const useConfetti = () => {
  // Confetti básico desde el centro
  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  // Confetti épico para BINGO (múltiples explosiones)
  const fireBingoConfetti = useCallback(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Explosiones desde ambos lados
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  }, []);

  // Confetti lateral (para cuando marcas correctamente)
  const fireSuccessConfetti = useCallback(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#a855f7', '#8b5cf6', '#7c3aed']
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#a855f7', '#8b5cf6', '#7c3aed']
    });
  }, []);

  // Confetti de estrellas (para nueva ronda)
  const fireNewRoundConfetti = useCallback(() => {
    const defaults = {
      spread: 360,
      ticks: 50,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      shapes: ['star'],
      colors: ['FFE400', 'FFBD00', 'E89400', 'FFCA6C', 'FDFFB8']
    };

    function shoot() {
      confetti({
        ...defaults,
        particleCount: 40,
        scalar: 1.2,
        shapes: ['star']
      });

      confetti({
        ...defaults,
        particleCount: 10,
        scalar: 0.75,
        shapes: ['circle']
      });
    }

    setTimeout(shoot, 0);
    setTimeout(shoot, 100);
    setTimeout(shoot, 200);
  }, []);

  // Confetti de corazones (compartible, por si acaso)
  const fireHeartsConfetti = useCallback(() => {
    const heart = confetti.shapeFromPath({
      path: 'M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z',
      matrix: [0.03333333333333333, 0, 0, 0.03333333333333333, -5.566666666666666, -5.533333333333333]
    });

    confetti({
      particleCount: 30,
      shapes: [heart],
      colors: ['#ff0066', '#ff6b9d', '#c9184a'],
      spread: 60,
      origin: { y: 0.6 }
    });
  }, []);

  // Memoizar el objeto de retorno para estabilizar la referencia
  return useMemo(() => ({
    fireConfetti,
    fireBingoConfetti,
    fireSuccessConfetti,
    fireNewRoundConfetti,
    fireHeartsConfetti,
  }), [fireConfetti, fireBingoConfetti, fireSuccessConfetti, fireNewRoundConfetti, fireHeartsConfetti]);
};
