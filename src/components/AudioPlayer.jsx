import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * Spotify Embed player - reproduce 30 segundos del track directamente en el navegador.
 * Usa el iframe oficial de Spotify que siempre funciona (no depende de preview_url).
 */
const AudioPlayer = ({ spotifyUrl, compact = false }) => {
  // Extraer track ID de la URL de Spotify o URI
  const trackId = useMemo(() => {
    if (!spotifyUrl) return null;

    // Formato URI: spotify:track:XXXXX
    if (spotifyUrl.startsWith('spotify:track:')) {
      return spotifyUrl.replace('spotify:track:', '');
    }

    // Formato URL: https://open.spotify.com/track/XXXXX?si=...
    const match = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }, [spotifyUrl]);

  if (!trackId) return null;

  const height = compact ? 80 : 152;
  const embedUrl = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;

  return (
    <div className="rounded-lg overflow-hidden border border-white/10">
      <iframe
        src={embedUrl}
        width="100%"
        height={height}
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title="Spotify player"
        className="block"
      />
    </div>
  );
};

AudioPlayer.propTypes = {
  spotifyUrl: PropTypes.string,
  compact: PropTypes.bool,
};

export default React.memo(AudioPlayer);
