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
    spotifyApi.setAccessToken(null);
  }, []);

  const login = useCallback(() => {
    window.location.href = spotifyConfig.loginUrl;
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

    if (storedToken) {
      logout();
    }
    return false;
  }, [token, logout]);

  useEffect(() => {
    const initializeAuth = () => {
      const hash = spotifyConfig.getTokenFromUrl();
      window.location.hash = "";
      const _token = hash.access_token;
      const _expiresIn = hash.expires_in;

      if (_token) {
        const expirationTime = Date.now() + ((_expiresIn || 3600) * 1000);
        localStorage.setItem('spotify_token', _token);
        localStorage.setItem('spotify_token_expiration', expirationTime.toString());

        setToken(_token);
        spotifyApi.setAccessToken(_token);
        setLoggedIn(true);
        setIsTokenValid(true);
      } else {
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