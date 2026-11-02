import { dom } from './state.js';
import { store } from './store.js';
import { dailyChallengeWords } from './data.js';
import { initializeGame, stopGame } from './game.js';
import { showScreen, updateDailyStreakDisplay } from './ui.js';
import { showModal } from './modal.js';
import { storage } from './storage.js';

export function getDailyWord() {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return dailyChallengeWords[seed % dailyChallengeWords.length];
}
export function startDailyChallenge() {
    if (storage.getItem('dailyChallengeLastPlayed') === new Date().toDateString()) {
        showModal('dailyPlayed');
        return;
    }
    stopGame();
    store.dispatch({ type: 'START_DAILY_CHALLENGE', payload: { word: getDailyWord() } });
    initializeGame();
    showScreen('game');
}
export function updateDailyChallengeButtonState() {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toDateString();
    const lastWin = storage.getItem('dailyChallengeLastWinDate');
    if (lastWin !== today.toDateString() && lastWin !== yesterday && store.getState().dailyStreak) {
        store.dispatch({ type: 'LOAD_SAVED_DATA', payload: { dailyStreak: 0 } });
        storage.setItem('dailyChallengeStreak', 0);
        updateDailyStreakDisplay(0);
    }
    const completed = storage.getItem('dailyChallengeLastPlayed') === today.toDateString();
    dom.dailyChallengeBtn.disabled = completed;
    dom.dailyChallengeBtnText.textContent = completed ? 'Played today ✓' : 'Daily Challenge';
    dom.dailyChallengeBtn.querySelector('small').textContent = completed ?
        'A new word arrives at local midnight.' : 'One word a day. Build your streak.';
}
