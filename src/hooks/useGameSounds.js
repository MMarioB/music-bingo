import { useRef, useCallback, useEffect, useMemo } from 'react';

/**
 * Hook para manejar sonidos del juego
 * Usa Web Audio API para generar sonidos sintéticos
 */
export const useGameSounds = () => {
  const audioContextRef = useRef(null);
  const enabledRef = useRef(true);

  // Inicializar AudioContext
  useEffect(() => {
    // Lazy init - solo crear cuando se use por primera vez
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Función base para crear tonos
  const playTone = useCallback((frequency, duration, type = 'sine', volume = 0.3) => {
    if (!enabledRef.current) return;

    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gainNode.gain.value = volume;

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, [getAudioContext]);

  // Sonido de acierto (escala ascendente alegre)
  const playSuccess = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Melodía ascendente C-E-G
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      const startTime = now + (i * 0.1);
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    });
  }, [getAudioContext]);

  // Sonido de error (tono bajo descendente)
  const playError = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(400, now);
    oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.5);
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    oscillator.start(now);
    oscillator.stop(now + 0.5);
  }, [getAudioContext]);

  // Sonido de BINGO (fanfarria épica)
  const playBingo = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Secuencia épica: C-E-G-C (octava alta)
    const melody = [
      { freq: 523.25, time: 0 },
      { freq: 659.25, time: 0.15 },
      { freq: 783.99, time: 0.3 },
      { freq: 1046.50, time: 0.45 },
      { freq: 783.99, time: 0.6 },
      { freq: 1046.50, time: 0.75 },
    ];

    melody.forEach(({ freq, time }) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'square';

      const startTime = now + time;
      gainNode.gain.setValueAtTime(0.4, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    });
  }, [getAudioContext]);

  // Sonido de notificación (breve y agradable)
  const playNotification = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Dos tonos rápidos
    [880, 1046.50].forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      const startTime = now + (i * 0.08);
      gainNode.gain.setValueAtTime(0.25, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.15);
    });
  }, [getAudioContext]);

  // Sonido de marca de celda (click satisfactorio)
  const playMark = useCallback(() => {
    playTone(1200, 0.05, 'sine', 0.2);
  }, [playTone]);

  // Sonido de nueva ronda (campanita)
  const playNewRound = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    [1046.50, 1318.51, 1567.98].forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      const startTime = now + (i * 0.12);
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    });
  }, [getAudioContext]);

  // Control de volumen/mute
  const toggleSound = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    return enabledRef.current;
  }, []);

  const isSoundEnabled = useCallback(() => enabledRef.current, []);

  // Memoizar el objeto de retorno para estabilizar la referencia
  return useMemo(() => ({
    playSuccess,
    playError,
    playBingo,
    playNotification,
    playMark,
    playNewRound,
    toggleSound,
    isSoundEnabled,
  }), [playSuccess, playError, playBingo, playNotification, playMark, playNewRound, toggleSound, isSoundEnabled]);
};
