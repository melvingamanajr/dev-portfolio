export async function getWordDefinition(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
            { signal: AbortSignal.timeout(3500) });
        if (!response.ok) return 'No definition available for this word.';
        const data = await response.json();
        return data[0]?.meanings?.[0]?.definitions?.[0]?.definition || 'No definition available for this word.';
    } catch {
        return 'Definition unavailable. You can keep playing.';
    }
}
