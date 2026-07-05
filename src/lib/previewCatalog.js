// Cliente del catálogo de previews del servidor (/api/tracks): devuelve
// canciones con MP3 de 30 segundos reproducibles sin cuenta de Spotify.

const API_BASE = (import.meta.env.VITE_WS_URL || '').replace(/\/$/, '');

export async function fetchArtistTracks(artist) {
    const res = await fetch(`${API_BASE}/api/tracks?artist=${encodeURIComponent(artist)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || `Error ${res.status} buscando canciones`);
    }
    return data.tracks || [];
}
