import { useState, useEffect, useCallback } from 'react';
import SpotifyWebApi from 'spotify-web-api-js';
import spotifyConfig from '../lib/spotify';

const spotifyApi = new SpotifyWebApi();

const isTokenExpired = () => {
  const expirationTime = localStorage.getItem('spotify_token_expiration');
  if (!expirationTime) return true;
  return Date.now() >= parseInt(expirationTime);
};

export const useSpotify = () => {
  const [token, setToken] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [lastPlayedTrack, setLastPlayedTrack] = useState(null);

  const logout = useCallback(() => {
    setToken(null);
    setLoggedIn(false);
    setIsTokenValid(false);
    localStorage.removeItem('spotify_token');
    localStorage.removeItem('spotify_token_expiration');
    localStorage.removeItem('spotify_refresh_token');
    spotifyApi.setAccessToken(null);
  }, []);

  const login = useCallback(async () => {
    const loginUrl = await spotifyConfig.getLoginUrl();
    window.location.href = loginUrl;
  }, []);

  const tryRefreshToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('spotify_refresh_token');

    if (!refreshToken) {
      return false;
    }

    try {
      const tokenData = await spotifyConfig.refreshAccessToken();
      const newToken = tokenData.access_token;

      setToken(newToken);
      spotifyApi.setAccessToken(newToken);
      setLoggedIn(true);
      setIsTokenValid(true);

      console.log('Token renovado exitosamente');
      return true;
    } catch (error) {
      console.error('Error renovando token:', error);
      return false;
    }
  }, []);

  const checkTokenValidity = useCallback(async () => {
    const storedToken = localStorage.getItem('spotify_token');

    if (storedToken && !isTokenExpired()) {
      if (!token) {
        setToken(storedToken);
        spotifyApi.setAccessToken(storedToken);
        setLoggedIn(true);
        setIsTokenValid(true);
      }
      return true;
    }

    // Si el token expiró, intentar renovarlo
    if (storedToken) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        return true;
      }
      logout();
    }
    return false;
  }, [token, logout, tryRefreshToken]);

  useEffect(() => {
    const initializeAuth = async () => {
      // Verificar si hay un código de autorización en la URL
      const code = spotifyConfig.getCodeFromUrl();

      if (code) {
        try {
          // Intercambiar el código por un token
          const tokenData = await spotifyConfig.exchangeCodeForToken(code);
          const _token = tokenData.access_token;
          const _expiresIn = tokenData.expires_in;

          if (_token) {
            const expirationTime = Date.now() + ((_expiresIn || 3600) * 1000);
            localStorage.setItem('spotify_token', _token);
            localStorage.setItem('spotify_token_expiration', expirationTime.toString());

            // Si hay refresh token, guardarlo también
            if (tokenData.refresh_token) {
              localStorage.setItem('spotify_refresh_token', tokenData.refresh_token);
            }

            setToken(_token);
            spotifyApi.setAccessToken(_token);
            setLoggedIn(true);
            setIsTokenValid(true);

            // Limpiar la URL del código
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error('Error durante la autenticación:', error);
          // Si falla, verificar si hay un token guardado
          checkTokenValidity();
        }
      } else {
        // Si no hay código, verificar si hay un token guardado
        checkTokenValidity();
      }
    };

    initializeAuth();
  }, [checkTokenValidity]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && lastPlayedTrack) {
        await checkTokenValidity();
        const gameState = localStorage.getItem('musicBingoState');
        if (gameState) {
          try {
            const parsedState = JSON.parse(gameState);
            if (Date.now() - parsedState.timestamp < 300000) {
              setLastPlayedTrack(parsedState.track);
            }
          } catch (error) {
            console.error('Error restaurando estado:', error);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [lastPlayedTrack, checkTokenValidity]);

  // Auto-renovar el token antes de que expire
  useEffect(() => {
    if (!loggedIn || !isTokenValid) return;

    const checkAndRefreshToken = async () => {
      const expirationTime = localStorage.getItem('spotify_token_expiration');
      const refreshToken = localStorage.getItem('spotify_refresh_token');

      if (!expirationTime || !refreshToken) return;

      const timeUntilExpiration = parseInt(expirationTime) - Date.now();
      const fiveMinutes = 5 * 60 * 1000; // 5 minutos en milisegundos

      // Si el token expira en menos de 5 minutos, renovarlo
      if (timeUntilExpiration < fiveMinutes && timeUntilExpiration > 0) {
        console.log('Token próximo a expirar, renovando automáticamente...');
        await tryRefreshToken();
      }
    };

    // Revisar cada minuto
    checkAndRefreshToken();
    const interval = setInterval(checkAndRefreshToken, 60000);

    return () => clearInterval(interval);
  }, [loggedIn, isTokenValid, tryRefreshToken]);

  const apiCall = async (fn) => {
    const isValid = await checkTokenValidity();
    if (!isValid) {
      login();
      throw new Error('Token inválido');
    }

    try {
      const result = await fn();
      return result;
    } catch (error) {
      if (error.status === 401) {
        logout();
        login();
      }
      throw error;
    }
  };

  const playTrack = async (trackUri) => {
    try {
      const gameState = {
        track: trackUri,
        timestamp: Date.now()
      };
      localStorage.setItem('musicBingoState', JSON.stringify(gameState));
      setLastPlayedTrack(trackUri);

      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        window.open(trackUri, '_blank');
      } else {
        await apiCall(() => spotifyApi.play({ uris: [trackUri] }));
      }
    } catch (error) {
      console.error('Error reproduciendo track:', error);
      window.open(trackUri, '_blank');
    }
  };

  return {
    spotify: {
      searchTracks: (query, options) => apiCall(() => spotifyApi.searchTracks(query, options)),
      searchArtists: (query, options) => apiCall(() => spotifyApi.searchArtists(query, options)),
      getArtistTopTracks: (artistId, market) => apiCall(() => spotifyApi.getArtistTopTracks(artistId, market)),
      playTrack
    },
    token,
    loggedIn,
    isTokenValid,
    login,
    logout,
    lastPlayedTrack
  };
};

export default useSpotify;