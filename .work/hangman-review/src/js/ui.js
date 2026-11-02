import { dom } from './state.js';
import { store } from './store.js';
import { wordData, difficultySettings } from './data.js';
import { getWordClue } from './clues.js';
import { playClickSound } from './audio.js';
import { startGameWithCategory, startGameWithDifficulty } from './game.js';

export function showScreen(screenName) {
    Object.entries(dom.screens).forEach(([name, screen]) => {
        screen.hidden = name !== screenName;
        screen.classList.toggle('active', name === screenName);
    });
    dom.screens[screenName].querySelector('h1')?.focus({ preventScroll: true });
}
export function createCategoryButtons() {
    dom.categoryButtonsDiv.replaceChildren();
    for (const [category, info] of Object.entries(wordData)) {
        const name = category[0].toUpperCase() + category.slice(1);
        const button = document.createElement('button');
        button.className = 'category-btn-item';
        button.innerHTML = `<span class="category-icon" aria-hidden="true">${info.icon}</span><span class="category-name">${name}<span class="category-detail">${info.words.length} words to discover</span></span>`;
        button.addEventListener('click', () => { playClickSound(); startGameWithCategory(category); });
        dom.categoryButtonsDiv.append(button);
    }
}
export function createDifficultyButtons() {
    dom.difficultyButtonsDiv.replaceChildren();
    for (const [level, info] of Object.entries(difficultySettings)) {
        const button = document.createElement('button');
        button.className = 'category-btn-item';
        button.innerHTML = `<span class="category-icon" aria-hidden="true">${info.icon}</span><span class="category-name">${level[0].toUpperCase() + level.slice(1)}<span class="category-detail">${info.time} seconds<br>${info.hints ? 'One free letter hint' : 'No letter hints. Trust your instincts.'}</span></span>`;
        button.addEventListener('click', () => { playClickSound(); startGameWithDifficulty(level); });
        dom.difficultyButtonsDiv.append(button);
    }
}
export function displayWord(word) {
    dom.wordDisplay.replaceChildren();
    dom.wordDisplay.style.setProperty('--word-length', word.length);
    [...word].forEach(() => {
        const tile = document.createElement('span');
        tile.className = 'letter';
        tile.setAttribute('aria-hidden', 'true');
        dom.wordDisplay.append(tile);
    });
    document.getElementById('word-length').textContent = `${word.length} LETTERS · THE HIDDEN WORD`;
    document.getElementById('word-description').textContent = getWordClue(word);
    document.getElementById('clue-timing').textContent = store.getState().gameMode === 'timedRush' ?
        'Use the clue to keep your rush going.' : 'Take your time. Your first letter starts the clock.';
    updateWordLabel();
}
function updateWordLabel() {
    const { selectedWord, correctLetters } = store.getState();
    const pattern = [...selectedWord].map(letter => correctLetters.includes(letter) ? letter.toUpperCase() : 'blank').join(', ');
    dom.wordDisplay.setAttribute('aria-label', `${selectedWord.length} letters: ${pattern}`);
}
export function revealLetter(letter) {
    [...dom.wordDisplay.children].forEach((tile, index) => {
        if (store.getState().selectedWord[index] === letter) {
            tile.textContent = letter;
            tile.classList.add('revealed');
        }
    });
    updateWordLabel();
}
export function revealWord() {
    const { selectedWord, correctLetters } = store.getState();
    [...dom.wordDisplay.children].forEach((tile, index) => {
        tile.textContent = selectedWord[index];
        tile.classList.add(correctLetters.includes(selectedWord[index]) ? 'revealed' : 'missed');
    });
    dom.wordDisplay.setAttribute('aria-label', `The word was ${selectedWord}`);
}
export function createKeyboard(handleGuess) {
    dom.keyboardDiv.replaceChildren();
    ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        [...row].forEach(letter => {
            const key = document.createElement('button');
            key.textContent = letter;
            key.className = 'key';
            key.dataset.key = letter;
            key.setAttribute('aria-label', `Guess letter ${letter.toUpperCase()}`);
            key.addEventListener('click', () => handleGuess(letter, key));
            rowDiv.append(key);
        });
        dom.keyboardDiv.append(rowDiv);
    });
}
export function updateFigure(count) {
    dom.hangmanParts.forEach((part, index) => part.classList.toggle('visible', index < count));
    const lives = document.getElementById('lives-display');
    lives.innerHTML = Array.from({ length: 6 }, (_, index) => `<span class="life${index < count ? ' lost' : ''}" aria-hidden="true"></span>`).join('');
    lives.setAttribute('aria-label', `${6 - count} incorrect guesses remaining`);
}
export const resetFigure = () => updateFigure(0);
export function feedback(message, type = '') {
    const element = document.getElementById('guess-feedback');
    element.textContent = message;
    element.className = `guess-feedback ${type}`;
}
export function updateScoreDisplay(currentScore, highScore) {
    dom.currentScoreSpan.textContent = currentScore;
    dom.highScoreSpan.textContent = highScore;
}
export function updateDailyStreakDisplay(value) { dom.dailyStreakSpan.textContent = value; }
export function displayStats(stats, bestStreak) {
    document.getElementById('stats-games-played').textContent = stats.played;
    document.getElementById('stats-wins').textContent = stats.wins;
    document.getElementById('stats-best-streak').textContent = bestStreak;
    document.getElementById('stats-win-ratio').textContent = stats.played ? Math.round(stats.wins / stats.played * 100) : 0;
}
export async function shareScore(highScore) {
    const text = `I solved ${highScore} words in Hangman! Can you beat it?`;
    try {
        if (navigator.share) await navigator.share({ title: 'Hangman', text, url: window.location.href });
        else {
            await navigator.clipboard.writeText(text);
            const button = document.getElementById('share-score-btn');
            if (button) button.textContent = 'Copied!';
        }
    } catch (error) {
        if (error.name === 'AbortError') return;
        const message = document.getElementById('share-feedback');
        if (message) message.textContent = text;
    }
}
