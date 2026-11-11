import { writeFileSync } from 'node:fs';

const size = 720;
const step = 6;
const field = (x, y) => {
  const u = x * Math.PI * 2 / size;
  const v = y * Math.PI * 2 / size;
  return .8 * Math.cos(u) + .7 * Math.sin(v) + .4 * Math.cos(u + v)
    + .22 * Math.sin(2 * u - v) + .12 * Math.cos(u + 3 * v);
};
const cases = [[], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]], [[2, 3]], [[0, 2]], [[0, 1], [2, 3]], [[1, 2]], [[1, 3]], [[0, 1]], [[3, 0]], []];
const paths = [];
for (let index = 0; index < 22; index++) {
  const level = -1.9 + index * .18;
  const nodes = new Map();
  const edges = [];
  const key = ([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`;
  const add = (point) => {
    const id = key(point);
    if (!nodes.has(id)) nodes.set(id, { point, edges: [] });
    return id;
  };
  for (let y = 0; y < size; y += step) for (let x = 0; x < size; x += step) {
    const points = [[x, y], [x + step, y], [x + step, y + step], [x, y + step]];
    const values = points.map(([px, py]) => field(px, py));
    const mask = values.reduce((value, sample, bit) => value | (sample > level ? 1 << bit : 0), 0);
    const crossing = (edge) => {
      const next = (edge + 1) % 4;
      const fraction = (level - values[edge]) / (values[next] - values[edge]);
      return points[edge].map((value, axis) => value + fraction * (points[next][axis] - value));
    };
    for (const pair of cases[mask]) {
      const endpoints = pair.map((edge) => add(crossing(edge)));
      if (endpoints[0] === endpoints[1]) continue;
      const edgeIndex = edges.length;
      edges.push(endpoints);
      endpoints.forEach((id) => nodes.get(id).edges.push(edgeIndex));
    }
  }
  const visited = new Set();
  const draw = (start) => {
    const points = [nodes.get(start).point];
    let current = start;
    while (true) {
      const edge = nodes.get(current).edges.find((candidate) => !visited.has(candidate));
      if (edge === undefined) break;
      visited.add(edge);
      current = edges[edge].find((id) => id !== current);
      points.push(nodes.get(current).point);
      if (current === start) break;
    }
    if (points.length < 2) return '';
    return `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}${current === start ? 'Z' : ''}`;
  };
  const parts = [];
  for (const [id, node] of nodes) if (node.edges.length === 1) parts.push(draw(id));
  for (const [id, node] of nodes) if (node.edges.some((edge) => !visited.has(edge))) parts.push(draw(id));
  if (parts.some(Boolean)) paths.push(`  <path d="${parts.join('')}" stroke-width="${index % 4 === 0 ? '1.2' : '.8'}" opacity="${index % 4 === 0 ? '1' : '.7'}"/>`);
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" stroke="#91a697" stroke-linejoin="round" stroke-linecap="round">\n${paths.join('\n')}\n</svg>\n`;
writeFileSync(new URL('../melvin-portfolio/dist/assets/contour-lines.svg', import.meta.url), svg);
console.log(`Created static contour artwork (${Buffer.byteLength(svg)} bytes).`);
