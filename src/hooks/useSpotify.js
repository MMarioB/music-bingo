import { useState, useEffect, useCallback } from 'react';
import SpotifyWebApi from 'spotify-web-api-js';
import { loginUrl, getTokenFromUrl } from '../lib/spotify';

const spotifyApi = new SpotifyWebApi();

// Función para verificar si el token ha expirado
const isTokenExpired = (token) => {
  try {
    const tokenData = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = tokenData.exp * 1000; // Convertir a milisegundos
    return Date.now() >= expirationTime;
  } catch (error) {
    console.error('Error verificando token:', error);
    return true;
  }
};

export const useSpotify = () => {
  const [token, setToken] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);

  // Función para verificar y actualizar el estado del token
  const checkTokenValidity = useCallback(() => {
    const storedToken = localStorage.getItem('spotify_token');
    
    if (storedToken) {
      // Si el token ha expirado, marcarlo como inválido
      if (isTokenExpired(storedToken)) {
        setIsTokenValid(false);
        logout();
        return false;
      }
      return true;
    }
    return false;
  }, []);

  // Efecto inicial para manejar la autenticación
  useEffect(() => {
    const initializeAuth = () => {
      // Primero verificar si hay un token en localStorage
      const storedToken = localStorage.getItem('spotify_token');
      
      if (storedToken && !isTokenExpired(storedToken)) {
        setToken(storedToken);
        spotifyApi.setAccessToken(storedToken);
        setLoggedIn(true);
        setIsTokenValid(true);
        return;
      }

      // Si no hay token válido en localStorage, buscar en la URL
      const hash = getTokenFromUrl();
      window.location.hash = "";
      const _token = hash.access_token;

      if (_token) {
        localStorage.setItem('spotify_token', _token);
        setToken(_token);
        spotifyApi.setAccessToken(_token);
        setLoggedIn(true);
        setIsTokenValid(true);
      } else {
        // Si no hay token en la URL ni en localStorage, limpiar todo
        logout();
      }
    };

    initializeAuth();
  }, []);

  // Efecto para verificar periódicamente la validez del token
  useEffect(() => {
    if (!token) return;

    const checkInterval = setInterval(() => {
      if (!checkTokenValidity()) {
        clearInterval(checkInterval);
      }
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
    spotifyApi.setAccessToken(null);
  }, []);

  const apiCall = async (fn) => {
    if (!checkTokenValidity()) {
      logout();
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