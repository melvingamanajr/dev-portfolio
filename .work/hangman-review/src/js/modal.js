import { dom } from './state.js';
import { store } from './store.js';
import { playClickSound } from './audio.js';
import { pauseGame } from './game.js';

const modalContents = {
    confirm: `<h2 id="modal-title">Leave this round?</h2><p>Your current word will be lost. Leaving a daily challenge counts as an attempt.</p><div class="modal-buttons"><button id="cancel-quit-btn" class="btn-primary">Keep playing</button><button id="confirm-quit-btn" class="btn-secondary">Leave game</button></div>`,
    reveal: `<h2 id="modal-title">Ready to see the word?</h2><p>Revealing the answer counts as a loss for this round.</p><div class="modal-buttons"><button id="cancel-reveal-btn" class="btn-primary">Keep guessing</button><button id="confirm-reveal-btn" class="btn-secondary">Reveal word</button></div>`,
    pause: `<div class="result-symbol" aria-hidden="true">Ⅱ</div><h2 id="modal-title">Take a breather.</h2><p>Your timer is paused. Your next great guess can wait.</p><div class="modal-buttons"><button id="close-pause-btn" class="btn-primary">Resume game ↗</button></div>`,
    dailyPlayed: `<h2 id="modal-title">That’s today’s word!</h2><p>You’ve already played today. A new challenge arrives at local midnight.</p><div class="modal-buttons"><button id="close-daily-played-btn" class="btn-primary">Got it</button></div>`,
    settings: `<h2 id="modal-title">Make yourself at home.</h2><div class="setting-item"><label for="volume-slider">Sound volume</label><input type="range" id="volume-slider" min="0" max="1" step="0.05" value="0.35"></div><p>Adjust background music and sound effects together.</p><div class="modal-buttons"><button id="close-settings-btn" class="btn-primary">Done</button></div>`,
    tutorial: `<h2 id="modal-title">A word to the wise.</h2><div class="tutorial-content"><p>Find the hidden word by tapping letters or typing A–Z. Correct guesses reveal every matching letter.</p><p>You have <strong>six incorrect guesses</strong>. Green keys are correct; crossed-out keys are misses.</p><p>Easy gives you 120 seconds, Medium 90, and Hard 60. Easy and Medium include one free letter hint per word.</p><p>Timed Rush gives you three minutes to solve as many words as possible. A missed word starts a fresh one.</p><p>Daily Challenge has one attempt each day, 60 seconds, and no letter hints. Win on consecutive days to grow your streak.</p><p>Use Pause or press Escape for a break. The clock also pauses when you switch tabs.</p><p>Every word has a description to guide you. For your first Classic round and the Daily Challenge, the timer starts with your first guess or letter hint. Clicking Next word starts the new timer immediately. Timed Rush starts immediately.</p></div><div class="modal-buttons"><button id="close-tutorial-btn" class="btn-primary">Let’s do this</button></div>`,
    stats: `<h2 id="modal-title">Your wordplay, in numbers.</h2><div class="stats-grid"><div class="stat-item"><span id="stats-games-played" class="stat-value">0</span><span class="stat-label">Words played</span></div><div class="stat-item"><span id="stats-wins" class="stat-value">0</span><span class="stat-label">Words solved</span></div><div class="stat-item"><span class="stat-value"><span id="stats-win-ratio">0</span>%</span><span class="stat-label">Win rate</span></div><div class="stat-item"><span id="stats-best-streak" class="stat-value">0</span><span class="stat-label">Best daily streak</span></div></div><div class="modal-buttons"><button id="reset-stats-btn" class="btn-secondary">Reset win rate</button><button id="close-stats-btn" class="btn-primary">Keep going</button></div>`,
};
let currentType = null;
let previousFocus = null;
export function isModalOpen() { return dom.modalContainer.classList.contains('show'); }
export function showModal(type, dynamicContent = '') {
    if (currentType === 'gameOver' && isModalOpen() && type !== 'gameOver') return;
    if (type !== 'gameOver') {
        const wasActive = store.getState().roundActive;
        pauseGame(true);
        if (currentType === 'gameOver' && isModalOpen()) return;
        if (wasActive && !store.getState().roundActive) return;
    }
    if (!isModalOpen()) previousFocus = document.activeElement;
    currentType = type;
    dom.modalContent.innerHTML = type === 'gameOver' ? dynamicContent : modalContents[type];
    dom.modalContent.setAttribute('aria-labelledby', 'modal-title');
    dom.modalContainer.classList.add('show');
    document.querySelector('.app-shell').inert = true;
    document.querySelector('.site-header').inert = true;
    document.querySelector('.site-footer').inert = true;
    if (type === 'settings') dom.volumeSlider = document.getElementById('volume-slider');
    (dom.modalContent.querySelector('button, input') || dom.modalContent).focus();
}
export function hideModal(force = false) {
    if (currentType === 'gameOver' && !force) return;
    dom.modalContainer.classList.remove('show');
    dom.modalContent.replaceChildren();
    document.querySelector('.app-shell').inert = false;
    document.querySelector('.site-header').inert = false;
    document.querySelector('.site-footer').inert = false;
    currentType = null;
    if (previousFocus?.isConnected && !previousFocus.disabled) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
    pauseGame(false);
}
export function initializeModal() {
    dom.modalContainer.addEventListener('click', event => {
        const id = event.target.closest('button')?.id || '';
        if (event.target === dom.modalContainer || id.startsWith('close-') || id.startsWith('cancel-')) {
            playClickSound(); hideModal();
        }
    });
    document.addEventListener('keydown', event => {
        if (!isModalOpen()) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopImmediatePropagation();
            hideModal();
        }
        if (event.key !== 'Tab') return;
        const elements = [...dom.modalContent.querySelectorAll('button:not(:disabled), input, [tabindex="0"], a[href]')];
        if (!elements.length) { event.preventDefault(); dom.modalContent.focus(); return; }
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && (document.activeElement === first || !elements.includes(document.activeElement))) {
            event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !elements.includes(document.activeElement))) {
            event.preventDefault(); first.focus();
        }
    });
}
