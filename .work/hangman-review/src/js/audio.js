import { dom } from './state.js';
import { store } from './store.js';
import { storage } from './storage.js';

// Short synthesized cues keep guess feedback immediate without extra audio downloads.
let context;
let volume = 0.35;
const notes = { correct: [523, 659], incorrect: [196, 165], click: [440], tick: [740] };

export const resultSounds = {
    win: new Audio(new URL('../assets/sounds/win.mp3', import.meta.url).href),
    lose: new Audio(new URL('../assets/sounds/lose.mp3', import.meta.url).href),
};
const resultClips = Object.values(resultSounds);
resultClips.forEach(sound => { sound.preload = 'auto'; });

export function stopResultSounds() {
    resultClips.forEach(sound => {
        sound.pause();
        sound.currentTime = 0;
    });
}

function syncResultSoundSettings() {
    const { isMuted } = store.getState();
    resultClips.forEach(sound => {
        sound.volume = volume;
        sound.muted = isMuted;
        if (isMuted || volume === 0) sound.pause();
    });
}

export const backgroundMusic = new Audio(new URL('../assets/sounds/music.mp3', import.meta.url).href);
backgroundMusic.loop = true;
backgroundMusic.preload = 'none';
let musicRequested = false;

function syncBackgroundMusic() {
    const { isMuted, paused } = store.getState();
    backgroundMusic.volume = volume * 0.5;
    backgroundMusic.muted = isMuted;
    if (!musicRequested || paused || isMuted || volume === 0 || document.hidden) {
        backgroundMusic.pause();
    } else if (backgroundMusic.paused) {
        // Playback starts from the user's game/mute/resume interaction.
        void backgroundMusic.play().catch(() => {});
    }
}

export function playBackgroundMusic(play) {
    musicRequested = play;
    syncBackgroundMusic();
}

store.subscribe(() => {
    syncBackgroundMusic();
    syncResultSoundSettings();
});

export function playSound(name) {
    if (store.getState().isMuted || volume === 0) return;
    try {
        if (resultSounds[name]) {
            stopResultSounds();
            syncResultSoundSettings();
            void resultSounds[name].play().catch(() => {});
            return;
        }
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        context ||= new AudioContext();
        if (context.state === 'suspended') void context.resume().catch(() => {});
        (notes[name] || []).forEach((frequency, index) => {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const start = context.currentTime + index * 0.09;
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(volume * 0.12, start + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(start);
            oscillator.stop(start + 0.14);
        });
    } catch { /* Sound is optional; gameplay continues. */ }
}
export const playClickSound = () => playSound('click');
export function setVolume(value, isMuted = false) {
    volume = Math.min(1, Math.max(0, Number(value) || 0));
    if (volume > 0 && isMuted) toggleMute(false);
    syncBackgroundMusic();
    syncResultSoundSettings();
}
export function toggleMute(shouldMute) {
    store.dispatch({ type: 'SET_MUTE', payload: { isMuted: shouldMute } });
    dom.muteBtn.textContent = shouldMute ? '♫' : '♪';
    dom.muteBtn.setAttribute('aria-label', shouldMute ? 'Unmute sound' : 'Mute sound');
    dom.muteBtn.setAttribute('aria-pressed', String(shouldMute));
    storage.setItem('hangmanMuted', shouldMute);
}
