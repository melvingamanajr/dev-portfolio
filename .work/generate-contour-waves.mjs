import { readFileSync, writeFileSync } from 'node:fs';

const source = readFileSync(new URL('../melvin-portfolio/dist/assets/contour-lines.svg', import.meta.url), 'utf8');
const size = 720;
const paths = [...source.matchAll(/<path d="([^"]+)" stroke-width="([^"]+)" opacity="([^"]+)"\/>/g)];
if (!paths.length) throw new Error('Static contour paths not found');
const animated = paths.map(([, original, width, opacity], index) => {
  const amplitude = 2.2 + (index % 4) * .2;
  const offset = index * 2.399963;
  const frames = Array.from({ length: 4 }, (_, frame) => {
    const phase = offset + frame * Math.PI / 2;
    return original.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, rawX, rawY) => {
      const x = Number(rawX), y = Number(rawY);
      const u = x * Math.PI * 2 / size, v = y * Math.PI * 2 / size;
      const dx = amplitude * Math.sin(u) * (.6 * Math.sin(v + phase) + .4 * Math.sin(2 * v - phase));
      const dy = amplitude * Math.sin(v) * (.6 * Math.sin(u - phase) + .4 * Math.cos(2 * u + phase));
      return `${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)}`;
    });
  });
  const duration = 72 + (index * 11) % 47;
  const begin = -((index * 17) % duration);
  return `  <path d="${frames[0]}" stroke-width="${width}" opacity="${opacity}">\n    <animate attributeName="d" dur="${duration}s" begin="${begin}s" values="${[...frames, frames[0]].join(';')}" keyTimes="0;.25;.5;.75;1" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/>\n  </path>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" stroke="#91a697" stroke-linejoin="round" stroke-linecap="round">\n${animated.join('\n')}\n</svg>\n`;
writeFileSync(new URL('../melvin-portfolio/dist/assets/contour-waves.svg', import.meta.url), svg);
console.log(`Created ${animated.length} independently phased contour waves (${Buffer.byteLength(svg)} bytes).`);
