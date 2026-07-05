import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Volume2 } from 'lucide-react';

/**
 * Reproduce la preview MP3 de 30 segundos en el dispositivo del GM.
 * Se sincroniza con el timer de la ronda (pausa/reanuda) y, si el navegador
 * bloquea el autoplay (típico en iOS), muestra un botón para iniciarla.
 */
const PreviewPlayer = ({ previewUrl, paused }) => {
  const audioRef = useRef(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (paused) {
      audio.pause();
      return;
    }

    const playPromise = audio.play();
    if (playPromise) {
      playPromise
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true));
    }
  }, [paused, previewUrl]);

  const handleManualPlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play()
      .then(() => setBlocked(false))
      .catch(() => setBlocked(true));
  };

  return (
    <>
      <audio ref={audioRef} src={previewUrl} preload="auto" className="hidden" />
      {blocked && !paused && (
        <button
          onClick={handleManualPlay}
          className="w-full h-11 rounded-lg border border-purple-400/50 bg-purple-600/60 hover:bg-purple-600 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors animate-pulse"
        >
          <Volume2 className="w-4 h-4" />
          Pulsa para reproducir la canción
        </button>
      )}
    </>
  );
};

PreviewPlayer.propTypes = {
  previewUrl: PropTypes.string.isRequired,
  paused: PropTypes.bool,
};

export default React.memo(PreviewPlayer);
