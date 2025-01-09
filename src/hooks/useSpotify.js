import { useState, useEffect, useCallback } from 'react';
import SpotifyWebApi from 'spotify-web-api-js';

export const useSpotify = () => {
  const [spotify, setSpotify] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [token, setToken] = useState(null);

  // Obtener el token de los parámetros de la URL
  const getTokenFromUrl = () => {
    return window.location.hash
      .substring(1)
      .split('&')
      .reduce((initial, item) => {
        let parts = item.split('=');
        initial[parts[0]] = decodeURIComponent(parts[1]);
        return initial;
      }, {});
  };

  // Inicializar Spotify Web API
  const initSpotify = useCallback(() => {
    const spotifyApi = new SpotifyWebApi();
    setSpotify(spotifyApi);
  }, []);

  // Login con Spotify
  const login = useCallback(() => {
    const clientId = '277eea2816be4656a4612eae1b3ca65e'; // Reemplaza con tu Client ID de Spotify
    const redirectUri = 'https://music-bingo-swart.vercel.app/'; // Reemplaza con tu Redirect URI
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-modify-playback-state',
      'user-read-playback-state',
      'streaming'
    ];

    window.location = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join('%20')}&response_type=token&show_dialogs=true`;
  }, []);

  // Efecto para manejar el token y la autenticación
  useEffect(() => {
    initSpotify();

    const hash = getTokenFromUrl();
    window.location.hash = '';

    const _token = hash.access_token;

    if (_token) {
      // Guardar token
      setToken(_token);

      // Configurar token en la instancia de Spotify
      if (spotify) {
        spotify.setAccessToken(_token);
      }

      // Verificar información del usuario
      spotify?.getMe()
        .then(user => {
          console.log('Usuario autenticado:', user);
          setLoggedIn(true);
        })
        .catch(error => {
          console.error('Error autenticando:', error);
          setLoggedIn(false);
        });
    }
  }, [initSpotify, spotify]);

  // Logout
  const logout = useCallback(() => {
    setToken(null);
    setLoggedIn(false);
  }, []);

  return {
    spotify,
    loggedIn,
    token,
    login,
    logout
  };
};