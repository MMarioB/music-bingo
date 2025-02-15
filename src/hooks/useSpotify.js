import { useState, useEffect, useCallback } from 'react';
import SpotifyWebApi from 'spotify-web-api-js';
import { loginUrl, getTokenFromUrl } from '../lib/spotify';
import { gameSocket } from '../services/socketService';

const spotifyApi = new SpotifyWebApi();

export const useSpotify = () => {
  const [token, setToken] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [roomCode, setRoomCode] = useState(null);

  const setupTokenRefresh = useCallback((expiresIn) => {
    // Programar la actualización 5 minutos antes de que expire
    const refreshTime = (expiresIn - 300) * 1000;
    const refreshTimeout = setTimeout(async () => {
      if (roomCode) {
        try {
          const response = await gameSocket.emit('requestSpotifyToken', { roomCode });
          if (response?.access_token) {
            updateToken(response.access_token, response.expires_in);
          }
        } catch (error) {
          console.error('Error refreshing token:', error);
          logout();
        }
      }
    }, refreshTime);

    return () => clearTimeout(refreshTimeout);
  }, [roomCode]);

  const updateToken = useCallback((newToken, expiresIn) => {
    if (!newToken) return;

    const expirationTime = Date.now() + (expiresIn * 1000);
    localStorage.setItem('spotify_token', newToken);
    localStorage.setItem('spotify_token_expiration', expirationTime.toString());

    setToken(newToken);
    spotifyApi.setAccessToken(newToken);
    setLoggedIn(true);
    setIsTokenValid(true);

    return setupTokenRefresh(expiresIn);
  }, [setupTokenRefresh]);

  const initializeRoom = useCallback(async (code, initialToken, expiresIn) => {
    setRoomCode(code);
    try {
      // Enviar token inicial al backend al crear la sala
      await gameSocket.createRoom({
        roomCode: code,
        spotifyToken: {
          access_token: initialToken,
          expires_in: expiresIn,
          refresh_token: localStorage.getItem('spotify_refresh_token')
        }
      });

      // Configurar listener para actualizaciones de token
      gameSocket.on('spotifyTokenUpdated', ({ access_token, expires_in }) => {
        updateToken(access_token, expires_in);
      });

    } catch (error) {
      console.error('Error initializing room:', error);
      logout();
    }
  }, [updateToken]);

  useEffect(() => {
    const initializeAuth = () => {
      const hash = getTokenFromUrl();
      window.location.hash = "";
      const _token = hash.access_token;
      const _expiresIn = hash.expires_in;
      const _refreshToken = hash.refresh_token;

      if (_token) {
        localStorage.setItem('spotify_refresh_token', _refreshToken);
        updateToken(_token, _expiresIn);
      }
    };

    initializeAuth();

    return () => {
      if (roomCode) {
        gameSocket.off('spotifyTokenUpdated');
      }
    };
  }, [updateToken, roomCode]);

  const login = () => {
    window.location.href = loginUrl;
  };

  const logout = useCallback(() => {
    setToken(null);
    setLoggedIn(false);
    setIsTokenValid(false);
    localStorage.removeItem('spotify_token');
    localStorage.removeItem('spotify_token_expiration');
    localStorage.removeItem('spotify_refresh_token');
    spotifyApi.setAccessToken(null);
  }, []);

  const apiCall = async (fn) => {
    if (!token) {
      login();
      throw new Error('No token available');
    }

    try {
      if (roomCode) {
        // Solicitar token actualizado antes de cada llamada API
        const response = await gameSocket.emit('requestSpotifyToken', { roomCode });
        if (response?.access_token) {
          updateToken(response.access_token, response.expires_in);
        }
      }

      const result = await fn();
      return result;
    } catch (error) {
      if (error.status === 401) {
        if (roomCode) {
          try {
            const response = await gameSocket.emit('requestSpotifyToken', { roomCode });
            if (response?.access_token) {
              updateToken(response.access_token, response.expires_in);
              return await fn();
            }
          } catch (refreshError) {
            console.error('Error refreshing token:', refreshError);
          }
        }
        logout();
        login();
      }
      throw error;
    }
  };

  return {
    spotify: {
      searchTracks: (query, options) => apiCall(() => spotifyApi.searchTracks(query, options)),
    },
    token,
    loggedIn,
    isTokenValid,
    login,
    logout,
    initializeRoom
  };
};

export default useSpotify;