import { useState, useEffect, useCallback } from 'react';
import SpotifyWebApi from 'spotify-web-api-js';
import { loginUrl, getTokenFromUrl } from '../lib/spotify';

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
  }, [token]);

  useEffect(() => {
    const initializeAuth = () => {
      const hash = getTokenFromUrl();
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
    if (!token) return;

    const checkInterval = setInterval(() => {
      checkTokenValidity();
    }, 1000 * 60); // Verificar cada minuto

    return () => clearInterval(checkInterval);
  }, [token, checkTokenValidity]);

  const login = () => {
    window.location.href = loginUrl;
  };

  const logout = useCallback(() => {
    setToken(null);
    setLoggedIn(false);
    setIsTokenValid(false);
    localStorage.removeItem('spotify_token');
    localStorage.removeItem('spotify_token_expiration');
    spotifyApi.setAccessToken(null);
  }, []);

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

  return {
    spotify: {
      searchTracks: (query, options) => apiCall(() => spotifyApi.searchTracks(query, options)),
    },
    token,
    loggedIn,
    isTokenValid,
    login,
    logout
  };
};

export default useSpotify;