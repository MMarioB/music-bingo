import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const SpotifyPlayer = ({ token, onDeviceReady }) => {
  console.log('MOUNTED SPOTIFY PLAYER', { hasToken: !!token }); // Log inicial

  const [player, setPlayer] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let spotifyPlayer = null;
    console.log('useEffect ejecutado - Iniciando setup', { 
      hasToken: !!token, 
      tokenStart: token?.substring(0, 10) 
    });

    const script = document.createElement("script");
    script.id = "spotify-player";
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;

    document.body.appendChild(script);
    console.log('Script de Spotify agregado al DOM');

    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log('SDK de Spotify listo - Creando player');
      
      spotifyPlayer = new window.Spotify.Player({
        name: 'Music Bingo Web Player',
        getOAuthToken: cb => { 
          console.log('getOAuthToken llamado', { tokenLength: token?.length });
          cb(token); 
        },
        volume: 0.5
      });

      // Error handling
      spotifyPlayer.addListener('initialization_error', ({ message }) => {
        console.error('Error de inicialización:', message);
      });

      spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('Error de autenticación:', message);
      });

      spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('Error de cuenta:', message);
      });

      spotifyPlayer.addListener('playback_error', ({ message }) => {
        console.error('Error de reproducción:', message);
      });

      spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Player listo', { device_id });
        setIsReady(true);
        onDeviceReady(device_id);
      });

      spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Player no listo', { device_id });
        setIsReady(false);
      });

      console.log('Intentando conectar player...');
      spotifyPlayer.connect()
        .then(success => {
          console.log('Resultado de conexión:', { success });
          if (success) {
            setPlayer(spotifyPlayer);
          }
        })
        .catch(error => {
          console.error('Error conectando:', error);
        });
    };

    return () => {
      console.log('Limpiando componente');
      if (spotifyPlayer) {
        console.log('Desconectando player');
        spotifyPlayer.disconnect();
      }
      if (script && script.parentNode) {
        console.log('Removiendo script');
        script.parentNode.removeChild(script);
      }
    };
  }, [token, onDeviceReady]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg z-50">
      <div className="text-center">
        {isReady ? (
          <p className="text-green-600">Reproductor web conectado ✓</p>
        ) : (
          <div>
            <p className="text-gray-500">
              Conectando reproductor... 
              ({token ? `Token presente (${token.substring(0, 5)}...)` : 'Sin token'})
            </p>
            <p className="text-xs text-gray-400">
              Estado: {player ? 'Player creado' : 'Player no creado'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

SpotifyPlayer.propTypes = {
  token: PropTypes.string.isRequired,
  onDeviceReady: PropTypes.func.isRequired
};

export default SpotifyPlayer;