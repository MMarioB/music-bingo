import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SpotifyWebApi from 'spotify-web-api-js';
import { loginUrl, getTokenFromUrl } from '../lib/spotify';

const spotifyApi = new SpotifyWebApi();

export const useSpotify = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const hash = getTokenFromUrl();
    window.location.hash = "";
    const _token = hash.access_token;

    if (_token) {
      setToken(_token);
      spotifyApi.setAccessToken(_token);

      // Obtener información del usuario actual
      spotifyApi.getMe()
        .then((data) => {
          setUser(data.body);
          setLoggedIn(true);
        }, (error) => {
          console.error('Error obtaining user information:', error);
          setLoggedIn(false);
        });
    }
  }, []);

  const login = () => {
    window.location.href = loginUrl;
  };

  const handleCallback = () => {
    const hash = getTokenFromUrl();
    window.location.hash = "";
    const _token = hash.access_token;

    if (_token) {
      setToken(_token);
      spotifyApi.setAccessToken(_token);
      setLoggedIn(true);
      navigate('/'); // Redirigir al usuario a la página principal de tu aplicación
    }
  };

  return {
    spotify: spotifyApi,
    token,
    loggedIn,
    user,
    login,
    handleCallback
  };
};