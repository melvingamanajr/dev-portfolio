import { readFileSync, writeFileSync } from 'node:fs';

const target = new URL('../melvin-portfolio/dist/index.html', import.meta.url);
let html = readFileSync(target, 'utf8');
const boot = `  <script>
    (() => {
      const root = document.documentElement;
      const views = ['home', 'work', 'experience', 'about', 'skills', 'contact'];
      let initial = 'home';
      try { const id = decodeURIComponent(location.hash.slice(1)); if (views.includes(id)) initial = id; } catch { /* Invalid fragments open Home. */ }
      root.dataset.view = initial;
      root.classList.add('js');
      try {
        const saved = localStorage.getItem('portfolio-theme');
        root.dataset.theme = ['dark', 'light'].includes(saved) ? saved : matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      } catch { /* The default theme also works without storage. */ }
    })();
  </script>
`;
html = html.replace('  <style>', () => boot + '  <style>');
const css = readFileSync(new URL('section-layout.css', import.meta.url), 'utf8');
html = html.replace('  </style>', () => '\n' + css + '\n  </style>');
const start = html.indexOf('    <section class="hero ');
const end = html.indexOf('    <section class="section work-section"', start);
if (start < 0 || end < 0) throw new Error('Expected Home boundaries missing');
html = html.slice(0, start) + readFileSync(new URL('section-home.html', import.meta.url), 'utf8') + '\n' + html.slice(end);
html = html.replace('<a href="#work">Work</a><a href="#experience">Experience</a><a href="#about">About</a><a href="#contact">Contact</a>', '<a href="#home">Home</a><a href="#work">Work</a><a href="#experience">Experience</a><a href="#about">About</a><a href="#skills">Skills</a><a href="#contact">Contact</a>');
html = html.replace('loading="eager" fetchpriority="high"', 'loading="lazy" fetchpriority="auto"');
html = html.replace('>Back to top <svg', '>Home <svg');
const navStart = html.indexOf('      const menuButton =');
const navEnd = html.indexOf('      const openers =', navStart);
if (navStart < 0 || navEnd < 0) throw new Error('Expected navigation boundaries missing');
html = html.slice(0, navStart) + readFileSync(new URL('section-navigation.js', import.meta.url), 'utf8') + '\n\n' + html.slice(navEnd);
writeFileSync(target, html);
console.log('Integrated Home, early route/theme setup, and one-section navigation.');
