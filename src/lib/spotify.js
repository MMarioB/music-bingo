const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = 'https://www.discohitsbingo.com';

const SCOPES = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'user-read-playback-state',
    'user-read-currently-playing',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-library-read'
].join(' ');

export const loginUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&response_type=token&show_dialog=true`;

export const getTokenFromUrl = () => {
    const hash = window.location.hash
        .substring(1)
        .split('&')
        .reduce((initial, item) => {
            let parts = item.split('=');
            initial[parts[0]] = decodeURIComponent(parts[1] || '');
            return initial;
        }, {});

    return {
        access_token: hash.access_token || null,
        token_type: hash.token_type || 'Bearer',
        expires_in: parseInt(hash.expires_in || '3600'),
        refresh_token: hash.refresh_token || null,
        state: hash.state || null
    };
};

export const getStoredToken = () => {
    const token = localStorage.getItem('spotify_token');
    const expiration = localStorage.getItem('spotify_token_expiration');
    const refreshToken = localStorage.getItem('spotify_refresh_token');

    if (!token || !expiration) return null;

    return {
        access_token: token,
        refresh_token: refreshToken,
        expires_in: Math.floor((parseInt(expiration) - Date.now()) / 1000)
    };
};

export default {
    loginUrl,
    getTokenFromUrl,
    getStoredToken
};