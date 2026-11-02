// Keep the game playable when browser storage is blocked or contains invalid data.
export const storage = {
    getItem(key) {
        try { return localStorage.getItem(key); } catch { return null; }
    },
    setItem(key, value) {
        try { localStorage.setItem(key, value); } catch { /* Session play still works. */ }
    },
    removeItem(key) {
        try { localStorage.removeItem(key); } catch { /* Nothing to clear. */ }
    },
};

export function savedNumber(key) {
    return safeCount(storage.getItem(key));
}

function safeCount(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

export function savedStats() {
    try {
        const value = JSON.parse(storage.getItem('hangmanStats'));
        const played = safeCount(value?.played);
        return { played, wins: Math.min(played, safeCount(value?.wins)) };
    } catch { return { played: 0, wins: 0 }; }
}
