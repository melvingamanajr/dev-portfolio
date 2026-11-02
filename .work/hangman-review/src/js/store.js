import { wordData, difficultySettings } from './data.js';

const initialState = {
    gameMode: 'classic', selectedWord: '', selectedCategory: '', difficultyLevel: 'medium',
    selectedDifficulty: difficultySettings.medium, correctLetters: [], wrongLetters: [],
    wrongGuessCount: 0, currentScore: 0, timedRushStreak: 0, highScore: 0,
    dailyStreak: 0, bestStreak: 0, isMuted: false, hasInteracted: false,
    gameStats: { played: 0, wins: 0 }, roundActive: false, paused: false, hintsUsed: false,
    waitingForFirstGuess: false,
};

function gameReducer(state = initialState, action) {
    const payload = action.payload || {};
    switch (action.type) {
        case 'START_GAME':
            return { ...state, gameMode: 'classic', hasInteracted: true, currentScore: 0 };
        case 'START_DAILY_CHALLENGE':
            return { ...state, hasInteracted: true, gameMode: 'daily', currentScore: 0,
                selectedCategory: 'Daily Challenge', difficultyLevel: 'hard',
                selectedDifficulty: difficultySettings.hard, selectedWord: payload.word };
        case 'START_TIMED_RUSH':
            return { ...state, hasInteracted: true, gameMode: 'timedRush', currentScore: 0,
                timedRushStreak: 0, difficultyLevel: 'medium', selectedDifficulty: difficultySettings.medium };
        case 'SET_CATEGORY':
            return { ...state, selectedCategory: payload.category };
        case 'SET_DIFFICULTY':
            return { ...state, gameMode: 'classic', difficultyLevel: payload.level,
                selectedDifficulty: difficultySettings[payload.level],
                selectedWord: wordData[state.selectedCategory].words[payload.wordIndex] };
        case 'SET_NEW_TIMED_RUSH_WORD':
            return { ...state, selectedWord: payload.word, selectedCategory: payload.category };
        case 'INITIALIZE_ROUND':
            return { ...state, correctLetters: [], wrongLetters: [], wrongGuessCount: 0,
                roundActive: true, paused: false, hintsUsed: false,
                waitingForFirstGuess: state.gameMode !== 'timedRush' };
        case 'BEGIN_GUESSING':
            return { ...state, waitingForFirstGuess: false };
        case 'CORRECT_GUESS':
            return { ...state, correctLetters: [...state.correctLetters, payload.letter] };
        case 'INCORRECT_GUESS':
            return { ...state, wrongLetters: [...state.wrongLetters, payload.letter],
                wrongGuessCount: state.wrongGuessCount + 1 };
        case 'USE_HINT':
            return { ...state, hintsUsed: true };
        case 'SET_PAUSED':
            return { ...state, paused: payload.paused };
        case 'LOCK_ROUND':
            return { ...state, roundActive: false };
        case 'END_GAME':
            return { ...state, ...payload, roundActive: false, paused: false, waitingForFirstGuess: false };
        case 'LOAD_SAVED_DATA':
            return { ...state, ...payload };
        case 'SET_MUTE':
            return { ...state, isMuted: payload.isMuted };
        case 'RESET_STATS':
            return { ...state, gameStats: { played: 0, wins: 0 } };
        default:
            return state;
    }
}

function createStore(reducer) {
    let state = reducer(undefined, { type: '@@INIT' });
    const listeners = new Set();
    return {
        getState: () => state,
        dispatch(action) { state = reducer(state, action); listeners.forEach(listener => listener()); },
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    };
}
export const store = createStore(gameReducer);
