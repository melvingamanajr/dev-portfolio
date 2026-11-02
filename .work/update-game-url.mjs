import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const oldUrl = 'https://melvingamanajr.github.io/hangman-game/src/';
const newUrl = 'https://melvingamanajr.github.io/hangman-game/src/index.html';
const html = await readFile('dist/index.html', 'utf8');
assert.equal(html.split(oldUrl).length - 1, 2, 'Expected the card and project model game URLs.');
await writeFile('dist/index.html', html.replaceAll(oldUrl, newUrl));
const readme = await readFile('README.md', 'utf8');
await writeFile('README.md', readme.replaceAll(oldUrl, newUrl));
console.log('Updated the card, project dialog model, and README to the supplied game URL.');
