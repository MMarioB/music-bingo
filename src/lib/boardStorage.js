// Persistencia del cartón en sessionStorage: sobrevive a refrescos de página
// y caídas de conexión, pero se limpia al cerrar la pestaña (partida nueva).

const boardStorageKey = (roomCode, owner) => `musicbingo-board-${roomCode}-${owner}`;

export const loadStoredBoard = (roomCode, owner, difficulty) => {
    try {
        const raw = sessionStorage.getItem(boardStorageKey(roomCode, owner));
        if (!raw) return null;
        const stored = JSON.parse(raw);
        if (stored.difficulty !== difficulty) return null;
        if (!Array.isArray(stored.board) || stored.board.length !== 25) return null;
        return stored.board;
    } catch {
        return null;
    }
};

export const storeBoard = (roomCode, owner, difficulty, board) => {
    try {
        sessionStorage.setItem(
            boardStorageKey(roomCode, owner),
            JSON.stringify({ difficulty, board })
        );
    } catch { /* storage no disponible */ }
};
