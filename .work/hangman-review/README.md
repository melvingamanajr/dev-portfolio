# Hangman

A browser word game with Classic, Timed Rush, and Daily Challenge modes. Built with plain HTML, CSS, and JavaScript modules; no build step or runtime dependencies.

## Play locally

With Node.js 22 or newer, run `npm start` and open `http://127.0.0.1:4173`. No installation is needed. Alternatively, serve the `src` folder with VS Code Live Server. JavaScript modules require HTTP rather than opening `index.html` directly from disk.

## Game modes

- **Classic:** choose one of six categories and a difficulty. Easy gives 120 seconds and one letter hint, Medium 90 seconds and one hint, and Hard 60 seconds without hints. Every round allows six incorrect guesses. Next word preserves your category, difficulty, and session score.
- **Timed Rush:** solve as many words as possible in three minutes. Wins and losses advance automatically; a loss resets the rush streak. Each completed word counts toward statistics.
- **Daily Challenge:** one attempt per local calendar day, with 60 seconds and no hints. Consecutive daily wins build your streak. Revealing the word or confirming that you want to leave counts as a lost attempt. Daily attempts are stored on this browser, not enforced by a server.

Use the on-screen keyboard or type A–Z. Pause with the button or Escape; changing tabs and opening dialogs also pause the timer. Scores, statistics, theme, and sound preferences are stored on this device when browser storage is available.

Every word includes a short description to guide your guesses, available offline in all three modes. The first round in Classic and the Daily Challenge give you time to read: the timer starts with your first letter guess, including a letter revealed by a hint. Clicking **Next word** starts the new round’s timer immediately. Timed Rush starts its shared three-minute clock immediately. Descriptions stay visible throughout the round and do not use up your letter hint.

Word definitions load from Dictionary API after a round. A missing connection or unavailable definition never blocks replay. Fonts have system fallbacks, and guess cues are generated locally with Web Audio. The original `assets/sounds/win.mp3` and `lose.mp3` play at round results; starting a new round or leaving stops the previous result sound. The original `assets/sounds/music.mp3` loops during gameplay, pauses with the game, and stops at results or when leaving. Mute and volume control both the music and sound effects.

## Verification

Run `npm test` for browser regression checks covering all three modes, timers, pause/resume, scoring, hints, replay, persistence, keyboard input, dialog focus, and responsive layouts. Tests use an installed Chrome or Edge with no extra packages. Set `BROWSER_PATH` if your browser is installed outside the standard locations. Screenshots are written to the ignored `.qa` folder.
