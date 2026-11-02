import { dom } from './state.js';
import { store } from './store.js';
import { wordData } from './data.js';
import { showScreen, displayWord, createKeyboard, updateFigure, revealLetter, revealWord, feedback,
    updateScoreDisplay, updateDailyStreakDisplay, shareScore } from './ui.js';
import { playSound, playClickSound, playBackgroundMusic, stopResultSounds } from './audio.js';
import { getWordDefinition } from './api.js';
import { showModal, hideModal } from './modal.js';
import { updateDailyChallengeButtonState } from './dailyChallenge.js';
import { storage } from './storage.js';

let clockId = null;
let remainingMs = 0;
let lastTick = 0;
let transitionId = null;
const bags = new Map();

function pickWord(key, words) {
    let bag = bags.get(key);
    if (!bag?.length) {
        bag = [...words];
        for (let index = bag.length - 1; index > 0; index--) {
            const other = Math.floor(Math.random() * (index + 1));
            [bag[index], bag[other]] = [bag[other], bag[index]];
        }
        // Avoid repeating the final word of the previous bag.
        if (bag.length > 1 && bag.at(-1) === store.getState().selectedWord) {
            [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
        }
        bags.set(key, bag);
    }
    return bag.pop();
}

export function startGameWithCategory(category) {
    store.dispatch({ type: 'SET_CATEGORY', payload: { category } });
    document.getElementById('difficulty-description').textContent =
        `${category[0].toUpperCase() + category.slice(1)} · Six incorrect guesses. You choose the pressure.`;
    showScreen('difficulty');
}
export function startGameWithDifficulty(level) {
    stopGame();
    const { selectedCategory } = store.getState();
    const words = wordData[selectedCategory].words;
    const word = pickWord(selectedCategory, words);
    store.dispatch({ type: 'SET_DIFFICULTY', payload: { level, wordIndex: words.indexOf(word) } });
    initializeGame();
    showScreen('game');
}
export function startTimedRushMode() {
    stopGame();
    store.dispatch({ type: 'START_TIMED_RUSH' });
    loadNewTimedRushWord();
    startClock(180);
    showScreen('game');
}
function loadNewTimedRushWord() {
    const word = pickWord('rush', Object.values(wordData).flatMap(info => info.words));
    const category = Object.keys(wordData).find(key => wordData[key].words.includes(word));
    store.dispatch({ type: 'SET_NEW_TIMED_RUSH_WORD', payload: { word, category } });
    initializeGame();
}
export function initializeGame() {
    stopResultSounds();
    store.dispatch({ type: 'INITIALIZE_ROUND' });
    const state = store.getState();
    const rush = state.gameMode === 'timedRush';
    hideModal(true);
    dom.gameContentWrapper.classList.remove('win-animation', 'shake');
    dom.timedRushTimerContainer.hidden = !rush;
    dom.timedRushStreakContainer.hidden = !rush;
    document.getElementById('round-timer-container').hidden = rush;
    dom.timedRushStreakSpan.textContent = state.timedRushStreak;
    dom.categoryHintSpan.textContent = state.selectedCategory[0].toUpperCase() + state.selectedCategory.slice(1);
    document.getElementById('round-mode').textContent = rush ? 'TIMED RUSH' :
        state.gameMode === 'daily' ? 'DAILY CHALLENGE' : `CLASSIC · ${state.difficultyLevel.toUpperCase()}`;
    document.getElementById('pause-game-btn').disabled = false;
    displayWord(state.selectedWord);
    createKeyboard(handleGuess);
    updateFigure(0);
    updateScoreDisplay(state.currentScore, state.highScore);
    dom.hintButton.disabled = !state.selectedDifficulty.hints;
    dom.hintButton.innerHTML = state.selectedDifficulty.hints ?
        '✧ Reveal a letter <span>1 available</span>' : '✧ Hints off <span>Hard mode</span>';
    dom.revealWordBtn.disabled = false;
    feedback(rush ? 'Solve the word. Keep the clock running.' : 'Read the clue, then try a letter when you’re ready.');
    if (!rush) {
        clearInterval(clockId);
        clockId = null;
        remainingMs = state.selectedDifficulty.time * 1000;
        renderTime();
    }
    playBackgroundMusic(true);
}
function renderTime() {
    const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const state = store.getState();
    const rush = state.gameMode === 'timedRush';
    const timer = rush ? dom.timedRushTimerSpan : dom.timerSpan;
    timer.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    timer.classList.toggle('urgent', seconds <= 10);
    const progress = document.getElementById('timer-progress');
    progress.style.width = `${Math.max(0, remainingMs / ((rush ? 180 : state.selectedDifficulty.time) * 1000) * 100)}%`;
    progress.classList.toggle('urgent', seconds <= 10);
}
function tick() {
    const now = Date.now();
    if (!store.getState().paused) remainingMs = Math.max(0, remainingMs - (now - lastTick));
    lastTick = now;
    renderTime();
    if (remainingMs === 0 && !store.getState().paused) {
        clearInterval(clockId);
        clockId = null;
        clearTimeout(transitionId);
        // A rush may expire during its brief between-word feedback.
        if (!store.getState().roundActive && store.getState().gameMode === 'timedRush') {
            showResults(false, 'Rush complete!', true);
        } else void endGame(false, "Time’s up!", true);
    }
}
function startClock(seconds) {
    clearInterval(clockId);
    remainingMs = seconds * 1000;
    lastTick = Date.now();
    renderTime();
    clockId = setInterval(tick, 200);
}
function startRoundTimer() {
    store.dispatch({ type: 'BEGIN_GUESSING' });
    document.getElementById('clue-timing').textContent = 'The clock is running. Your clue stays here to help.';
    startClock(store.getState().selectedDifficulty.time);
}
export function pauseGame(paused) {
    if (paused && clockId) {
        tick();
        if (!clockId) return;
    }
    lastTick = Date.now();
    store.dispatch({ type: 'SET_PAUSED', payload: { paused } });
}
export function stopGame() {
    stopResultSounds();
    playBackgroundMusic(false);
    clearInterval(clockId);
    clearTimeout(transitionId);
    clockId = null;
    transitionId = null;
    store.dispatch({ type: 'END_GAME', payload: {} });
}
export function handleGuess(letter, key = dom.keyboardDiv.querySelector(`[data-key="${letter}"]`)) {
    const state = store.getState();
    if (!state.roundActive || state.paused || !key || key.disabled || !/^[a-z]$/.test(letter)) return;
    if (state.waitingForFirstGuess) {
        startRoundTimer();
    }
    key.disabled = true;
    const correct = state.selectedWord.includes(letter);
    key.classList.add(correct ? 'correct' : 'incorrect');
    key.setAttribute('aria-label', `${letter.toUpperCase()}: ${correct ? 'correct' : 'not in the word'}`);
    if (correct) {
        playSound('correct');
        store.dispatch({ type: 'CORRECT_GUESS', payload: { letter } });
        revealLetter(letter);
        const count = [...state.selectedWord].filter(value => value === letter).length;
        feedback(`Nice! ${letter.toUpperCase()} appears ${count === 1 ? 'once' : count + ' times'}.`, 'success');
        const updated = store.getState();
        if ([...new Set(updated.selectedWord)].every(value => updated.correctLetters.includes(value))) void endGame(true);
    } else {
        playSound('incorrect');
        store.dispatch({ type: 'INCORRECT_GUESS', payload: { letter } });
        const count = store.getState().wrongGuessCount;
        updateFigure(count);
        feedback(`No ${letter.toUpperCase()} this time. ${6 - count} incorrect ${count === 5 ? 'guess' : 'guesses'} left.`, 'error');
        dom.gameContentWrapper.classList.remove('shake');
        void dom.gameContentWrapper.offsetWidth;
        dom.gameContentWrapper.classList.add('shake');
        if (count >= 6) void endGame(false);
    }
}
export function useHint() {
    const state = store.getState();
    if (!state.roundActive || state.paused || state.hintsUsed || !state.selectedDifficulty.hints) return;
    const hidden = [...new Set(state.selectedWord)].filter(letter => !state.correctLetters.includes(letter));
    if (!hidden.length) return;
    store.dispatch({ type: 'USE_HINT' });
    dom.hintButton.disabled = true;
    dom.hintButton.innerHTML = '✧ Hint used <span>Nice little boost</span>';
    handleGuess(hidden[Math.floor(Math.random() * hidden.length)]);
}
function saveRound(isWinner) {
    const state = store.getState();
    const gameStats = { played: state.gameStats.played + 1, wins: state.gameStats.wins + Number(isWinner) };
    const currentScore = state.currentScore + Number(isWinner);
    const highScore = Math.max(state.highScore, currentScore);
    let { dailyStreak, bestStreak } = state;
    if (state.gameMode === 'daily') {
        const today = new Date();
        const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toDateString();
        const todayString = today.toDateString();
        dailyStreak = isWinner ?
            (storage.getItem('dailyChallengeLastWinDate') === yesterday ? dailyStreak + 1 : 1) : 0;
        bestStreak = Math.max(bestStreak, dailyStreak);
        if (isWinner) storage.setItem('dailyChallengeLastWinDate', todayString);
        storage.setItem('dailyChallengeLastPlayed', todayString);
        storage.setItem('dailyChallengeStreak', dailyStreak);
        storage.setItem('hangmanBestStreak', bestStreak);
    }
    const timedRushStreak = state.gameMode === 'timedRush' ? (isWinner ? state.timedRushStreak + 1 : 0) : 0;
    store.dispatch({ type: 'END_GAME', payload: {
        gameStats, currentScore, highScore, dailyStreak, bestStreak, timedRushStreak,
    } });
    storage.setItem('hangmanStats', JSON.stringify(gameStats));
    storage.setItem('hangmanHighScore', highScore);
    updateScoreDisplay(currentScore, highScore);
    updateDailyStreakDisplay(dailyStreak);
    updateDailyChallengeButtonState();
}
export async function endGame(isWinner, message = '', expired = false) {
    const before = store.getState();
    if (!before.roundActive) return;
    if (before.gameMode !== 'timedRush' || expired) playBackgroundMusic(false);
    // Lock synchronously before sounds, network requests, or another input event.
    store.dispatch({ type: 'LOCK_ROUND' });
    saveRound(isWinner);
    revealWord();
    dom.keyboardDiv.querySelectorAll('button').forEach(button => { button.disabled = true; });
    dom.hintButton.disabled = true;
    dom.revealWordBtn.disabled = true;
    playSound(isWinner ? 'win' : 'lose');
    if (isWinner) dom.gameContentWrapper.classList.add('win-animation');
    const rush = before.gameMode === 'timedRush';
    if (rush && !expired) {
        feedback(isWinner ? 'Word solved! Here comes the next one…' :
            `The word was ${before.selectedWord.toUpperCase()}. New word coming…`, isWinner ? 'success' : 'error');
        transitionId = setTimeout(() => {
            // Preserve this transition while a menu is open.
            const advance = () => {
                if (store.getState().paused) transitionId = setTimeout(advance, 100);
                else loadNewTimedRushWord();
            };
            advance();
        }, 850);
        return;
    }
    clearInterval(clockId);
    clockId = null;
    clearTimeout(transitionId);
    showResults(isWinner, message, expired);
}
function showResults(isWinner, message, expired) {
    playBackgroundMusic(false);
    const state = store.getState();
    const rush = state.gameMode === 'timedRush';
    document.getElementById('pause-game-btn').disabled = true;
    const title = message || (isWinner ? 'Beautifully guessed.' : 'Every word is a new chance.');
    showModal('gameOver', `<div class="result-symbol" aria-hidden="true">${isWinner || rush ? '✦' : '↻'}</div>
        <h2 id="modal-title"></h2><p>${rush ? 'The last word was' : 'The hidden word was'}</p>
        <div class="result-word"></div><p id="word-definition" class="definition">Looking up the definition…</p>
        <p>${rush ? `You solved <strong>${state.currentScore}</strong> words in this rush.` :
            `Session score: <strong>${state.currentScore}</strong> · Personal best: <strong>${state.highScore}</strong>`}</p>
        <div class="modal-buttons">${state.gameMode === 'classic' ? '<button id="next-word-btn" class="btn-primary">Next word ↗</button>' :
            rush ? '<button id="restart-rush-btn" class="btn-primary">Try another rush ↗</button>' : ''}
        <button id="result-menu-btn" class="btn-secondary">${state.gameMode === 'classic' ? 'Categories' : 'Main menu'}</button></div>
        ${isWinner || rush ? '<button id="share-score-btn" class="btn-quiet">Share score ↗</button><p id="share-feedback" role="status"></p>' : ''}`);
    document.getElementById('modal-title').textContent = title;
    dom.modalContent.querySelector('.result-word').textContent = state.selectedWord;
    const definitionElement = document.getElementById('word-definition');
    // Results and replay are usable immediately; a slow dictionary never blocks play.
    void getWordDefinition(state.selectedWord).then(definition => {
        if (definitionElement.isConnected) definitionElement.textContent = definition;
    });
    document.getElementById('next-word-btn')?.addEventListener('click', () => {
        playClickSound();
        startGameWithDifficulty(state.difficultyLevel);
        startRoundTimer();
        feedback('The clock is running. Use the clue to guide your guesses.');
    });
    document.getElementById('restart-rush-btn')?.addEventListener('click', startTimedRushMode);
    document.getElementById('result-menu-btn').addEventListener('click', () => {
        stopGame();
        hideModal(true);
        if (state.gameMode === 'classic') {
            store.dispatch({ type: 'START_GAME' });
            showScreen('category');
        } else showScreen('intro');
    });
    document.getElementById('share-score-btn')?.addEventListener('click', () => shareScore(state.currentScore));
}
