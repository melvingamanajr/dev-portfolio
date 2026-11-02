import { dom } from './state.js';
import { store } from './store.js';
import { playClickSound, setVolume, toggleMute } from './audio.js';
import { showScreen, createCategoryButtons, createDifficultyButtons, displayStats,
    updateScoreDisplay, updateDailyStreakDisplay } from './ui.js';
import { handleGuess, endGame, startTimedRushMode, stopGame, useHint } from './game.js';
import { showModal, hideModal, initializeModal, isModalOpen } from './modal.js';
import { startDailyChallenge, updateDailyChallengeButtonState } from './dailyChallenge.js';
import { storage, savedNumber, savedStats } from './storage.js';

function init() {
    store.dispatch({ type: 'LOAD_SAVED_DATA', payload: {
        highScore: savedNumber('hangmanHighScore'), dailyStreak: savedNumber('dailyChallengeStreak'),
        bestStreak: savedNumber('hangmanBestStreak'), gameStats: savedStats(),
    } });
    updateScoreDisplay(0, store.getState().highScore);
    updateDailyStreakDisplay(store.getState().dailyStreak);
    createCategoryButtons();
    createDifficultyButtons();
    updateDailyChallengeButtonState();
    setVolume(storage.getItem('hangmanVolume') ?? 0.35);
    toggleMute(storage.getItem('hangmanMuted') === 'true');
    const light = storage.getItem('hangmanTheme') === 'light';
    document.body.classList.toggle('light-mode', light);
    dom.themeToggle.checked = light;
    initializeModal();
    showScreen('intro');

    dom.startGameBtn.addEventListener('click', () => {
        playClickSound();
        stopGame();
        store.dispatch({ type: 'START_GAME' });
        updateScoreDisplay(0, store.getState().highScore);
        showScreen('category');
    });
    dom.dailyChallengeBtn.addEventListener('click', () => { playClickSound(); startDailyChallenge(); });
    dom.timedRushBtn.addEventListener('click', () => { playClickSound(); startTimedRushMode(); });
    dom.quitGameBtn.addEventListener('click', () => { playClickSound(); showModal('confirm'); });
    document.getElementById('pause-game-btn').addEventListener('click', () => showModal('pause'));
    dom.backToIntroBtn.addEventListener('click', () => { updateDailyChallengeButtonState(); showScreen('intro'); });
    dom.backToCategoryBtn.addEventListener('click', () => showScreen('category'));
    dom.hintButton.addEventListener('click', useHint);
    dom.revealWordBtn.addEventListener('click', () => showModal('reveal'));

    document.addEventListener('keydown', event => {
        if (!dom.screens.game.classList.contains('active') || isModalOpen()) return;
        if (event.key === 'Escape' && store.getState().roundActive) {
            event.preventDefault(); showModal('pause'); return;
        }
        if (event.ctrlKey || event.metaKey || event.altKey || event.repeat ||
            event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
        const letter = event.key.toLowerCase();
        if (/^[a-z]$/.test(letter)) { event.preventDefault(); handleGuess(letter); }
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && dom.screens.game.classList.contains('active') && !isModalOpen()) showModal('pause');
        if (!document.hidden) updateDailyChallengeButtonState();
    });
    dom.howToPlayBtn.addEventListener('click', () => showModal('tutorial'));
    dom.statsBtn.addEventListener('click', () => {
        showModal('stats');
        if (document.getElementById('stats-games-played')) displayStats(store.getState().gameStats, store.getState().bestStreak);
    });
    dom.settingsBtn.addEventListener('click', () => {
        showModal('settings');
        if (!document.getElementById('volume-slider')) return;
        dom.volumeSlider.value = storage.getItem('hangmanVolume') ?? '0.35';
        dom.volumeSlider.addEventListener('input', event => {
            const volume = Number(event.target.value);
            setVolume(volume, store.getState().isMuted);
            storage.setItem('hangmanVolume', volume);
        });
    });
    dom.modalContent.addEventListener('click', event => {
        const id = event.target.closest('button')?.id;
        if (id === 'confirm-quit-btn') {
            const daily = store.getState().gameMode === 'daily';
            hideModal(true);
            if (daily && store.getState().roundActive) void endGame(false, 'Challenge ended.');
            else {
                stopGame();
                updateDailyChallengeButtonState();
                showScreen('intro');
            }
        }
        if (id === 'confirm-reveal-btn') {
            hideModal(true);
            void endGame(false, 'Mystery revealed.');
        }
        if (id === 'reset-stats-btn') {
            store.dispatch({ type: 'RESET_STATS' });
            storage.removeItem('hangmanStats');
            displayStats(store.getState().gameStats, store.getState().bestStreak);
        }
    });
    dom.muteBtn.addEventListener('click', () => toggleMute(!store.getState().isMuted));
    dom.themeToggle.addEventListener('change', () => {
        document.body.classList.toggle('light-mode', dom.themeToggle.checked);
        storage.setItem('hangmanTheme', dom.themeToggle.checked ? 'light' : 'dark');
    });
    document.querySelector('.brand').addEventListener('click', event => {
        event.preventDefault();
        if (dom.screens.game.classList.contains('active')) showModal('confirm');
        else { stopGame(); updateDailyChallengeButtonState(); showScreen('intro'); }
    });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
