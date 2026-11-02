// DOM Elements
export const dom = {
    screens: {
        intro: document.getElementById('intro-screen'),
        category: document.getElementById('category-screen'),
        difficulty: document.getElementById('difficulty-screen'),
        game: document.getElementById('game-screen'),
    },
    gameContentWrapper: document.querySelector('.game-content-wrapper'),
    wordDisplay: document.querySelector('.word-display'),
    keyboardDiv: document.querySelector('.keyboard'),
    categoryButtonsDiv: document.getElementById('category-buttons-container'),
    categoryHintSpan: document.getElementById('category-hint'),
    hangmanParts: document.querySelectorAll('#game-screen .figure-part'),
    modalContainer: document.getElementById('modal-container'), // The single container
    modalContent: document.getElementById('modal-content'), // The content div inside
    highScoreSpan: document.getElementById('high-score'),
    dailyStreakSpan: document.getElementById('daily-streak'),
    currentScoreSpan: document.getElementById('current-score'),
    timedRushStreakContainer: document.getElementById('timed-rush-streak-container'),
    timedRushStreakSpan: document.getElementById('timed-rush-streak'),
    startGameBtn: document.getElementById('start-game-btn'),
    quitGameBtn: document.getElementById('quit-game-btn'),
    timedRushBtn: document.getElementById('timed-rush-btn'),
    dailyChallengeBtn: document.getElementById('daily-challenge-btn'),
    dailyChallengeBtnText: document.getElementById('daily-challenge-btn').querySelector('.btn-text'),
    backToIntroBtn: document.getElementById('back-to-intro-btn'),
    backToCategoryBtn: document.getElementById('back-to-category-btn'),
    difficultyButtonsDiv: document.getElementById('difficulty-buttons'),
    muteBtn: document.getElementById('mute-btn'),
    volumeSlider: null, // Will be queried dynamically
    timerSpan: document.getElementById('timer'),
    timedRushTimerContainer: document.getElementById('timed-rush-timer-container'),
    timedRushTimerSpan: document.getElementById('timed-rush-timer'),
    hintButton: document.getElementById('hint-button'),
    revealWordBtn: document.getElementById('reveal-word-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    // Buttons inside modals will be queried dynamically
    settingsBtn: document.getElementById('settings-btn'),
    howToPlayBtn: document.getElementById('how-to-play-btn'),
    statsBtn: document.getElementById('stats-btn'),
};