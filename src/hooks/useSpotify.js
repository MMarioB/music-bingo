import { useState, useEffect } from 'react';
import SpotifyWebApi from 'spotify-web-api-js';
import { loginUrl, getTokenFromUrl, isTokenValid } from '../lib/spotify';

const spotifyApi = new SpotifyWebApi();

export const useSpotify = () => {
  const [token, setToken] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('spotify_token');
    if (storedToken && isTokenValid(storedToken)) {
      setToken(storedToken);
      spotifyApi.setAccessToken(storedToken);
      setLoggedIn(true);
    } else {
      const hash = getTokenFromUrl();
      window.location.hash = "";
      const _token = hash.access_token;

      if (_token) {
        localStorage.setItem('spotify_token', _token);
        setToken(_token);
        spotifyApi.setAccessToken(_token);
        setLoggedIn(true);
      }
    }
  }, []);

  const login = () => {
    window.location.href = loginUrl;
  };

  const logout = () => {
    setToken(null);
    setLoggedIn(false);
    localStorage.removeItem('spotify_token');
    spotifyApi.setAccessToken(null);
  };

  const apiCall = async (fn) => {
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
    login,
    logout
  };
};

export default useSpotify;