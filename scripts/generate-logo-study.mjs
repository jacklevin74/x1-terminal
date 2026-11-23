// Local concept study. Lettering is outlined so previews never depend on font loading.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../../x1xyz/node_modules/three-stdlib/libs/opentype.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'apps/terminal/public/dev-refs/logo-fresh-start');
const fonts = '/Users/austinludwig/Library/Fonts';
const x = 'M76.9314 0H62.289L42.451 26.1546L23.9103 0H0L29.6265 39.6956L0 80H23.0058L41.8736 54.0388L59.7085 80H82.7143L54.7044 39.7582L85.3119 0H76.9314Z';
const one = 'M85.3125 15.7479L97.3316 0H123.001V79.9681H104.697V15.7479H85.3125Z';

function outlined(file, text, targetHeight, tracking = 0) {
  const bytes = fs.readFileSync(path.join(fonts, file));
  const font = parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const p = font.getPath(text, 0, 0, 100, { kerning: true, letterSpacing: tracking });
  const b = p.getBoundingBox();
  const scale = targetHeight / (b.y2 - b.y1);
  return { width: (b.x2 - b.x1) * scale, paths: `<g transform="scale(${scale}) translate(${-b.x1} ${-b.y1})"><path d="${p.toPathData(3)}"/></g>` };
}

// A deliberately drawn alphabet: 12-unit stems, open counters and clipped corners.
function geometric() {
  const letters = [
    [44, 'M0 0H44V11H28V60H16V11H0Z'],
    [39, 'M0 0H39V11H12V24H35V35H12V49H39V60H0Z'],
    [44, 'M0 0H32L44 12V27L35 36L46 60H32L22 38H12V60H0ZM12 11V27H29L32 24V15L28 11Z'],
    [55, 'M0 60V0H12L27.5 26L43 0H55V60H43V22L27.5 47L12 22V60Z'],
    [12, 'M0 0H12V60H0Z'],
    [46, 'M0 60V0H12L34 38V0H46V60H34L12 22V60Z'],
    [47, 'M0 60L17 0H30L47 60H34L31 47H15L12 60ZM18 36H28L23 15Z'],
    [37, 'M0 0H12V49H37V60H0Z'],
  ];
  let pos = 0;
  const paths = letters.map(([w, d]) => { const s = `<path transform="translate(${pos} 0)" fill-rule="evenodd" d="${d}"/>`; pos += w + 7; return s; }).join('');
  return { width: pos - 7, paths };
}

const directions = [
  { id: '01-grotesk', x: 151, y: 7, word: outlined('AeonikPro-Regular.otf', 'terminal', 73, -0.025) },
  { id: '02-instrument', x: 155, y: 17, word: outlined('OpenSauceTwo-Medium.ttf', 'TERMINAL', 46, 0.025) },
  { id: '03-cut', x: 151, y: 10, word: geometric() },
  { id: '04-baseline', x: 145, y: 24, word: outlined('AeonikPro-Regular.otf', 'terminal', 56, -0.025) },
  { id: '05-centred', x: 151, y: 12, word: outlined('AeonikPro-Regular.otf', 'terminal', 56, -0.025) },
  { id: '06-close', x: 139, y: 12, word: outlined('AeonikPro-Regular.otf', 'terminal', 68, -0.025) },
  { id: '07-italic', x: 145, y: 16, word: outlined('AeonikPro-RegularItalic.otf', 'terminal', 64, -0.025) },
  { id: '08-bold-italic', x: 147, y: 18, word: outlined('AeonikPro-BoldItalic.otf', 'terminal', 62, -0.025) },
  { id: '09-full-italic', x: 152, y: 18, markSkew: -10, word: outlined('AeonikPro-BoldItalic.otf', 'terminal', 62, -0.025) },
];

fs.mkdirSync(out, { recursive: true });
for (const d of directions) {
  for (const theme of ['dark', 'light', 'mono']) {
    const ink = theme === 'light' ? '#111318' : '#f2f4f7';
    const width = d.x + d.word.width;
    const markTransform = d.markSkew ? `translate(${-80 * Math.tan(d.markSkew * Math.PI / 180)} 0) skewX(${d.markSkew})` : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 80" fill="${ink}" role="img" aria-label="X1 Terminal"><title>X1 Terminal — ${d.id}</title><defs><linearGradient id="blue" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#00c6ff"/><stop offset="1" stop-color="#0072ff"/></linearGradient></defs><g transform="${markTransform}"><path d="${x}"/><path d="${one}" fill="${theme === 'mono' ? ink : 'url(#blue)'}"/></g><g transform="translate(${d.x} ${d.y})">${d.word.paths}</g></svg>`;
    fs.writeFileSync(path.join(out, `${d.id}-${theme}.svg`), svg);
  }
}
console.log(`Wrote ${directions.length * 3} outlined SVG concepts.`);

// Five structural alternatives. All use the unmodified X1 path geometry.
const word = (file, text, height, tracking = 0) => outlined(file, text, height, tracking);
const at = (shape, tx, ty, scale = 1) => `<g transform="translate(${tx} ${ty}) scale(${scale})">${shape.paths}</g>`;
const stacked = word('OpenSauceTwo-SemiBold.ttf', 'TERMINAL', 21, 0.06);
const condensed = word('Tomorrow-SemiBold.ttf', 'TERMINAL', 80, -0.02);
const editorial = word('PPTelegraf-Regular.otf', 'Terminal', 63, -0.035);
const mono = word('ProtoMono-Medium.ttf', 'terminal', 49, -0.02);
const reverse = word('ClashGrotesk-Medium.otf', 'terminal', 65, -0.025);
const offsetStudies = [
  { id: '15-offset-close', font: 'PPTelegraf-Regular.otf', th: 63, tx: 77, ty: 17, ms: 0.55, tracking: -0.035 },
  { id: '16-offset-deep', font: 'PPTelegraf-Regular.otf', th: 60, tx: 89, ty: 35, ms: 0.62, tracking: -0.035 },
  { id: '17-offset-brand', font: 'PPTelegraf-Regular.otf', th: 54, tx: 106, ty: 26, ms: 0.72, tracking: -0.025 },
  { id: '18-offset-medium', font: 'OpenSauceTwo-Medium.ttf', th: 60, tx: 82, ty: 24, ms: 0.53, tracking: -0.035 },
  { id: '19-offset-grotesk', font: 'MonumentGrotesk-Regular.ttf', th: 60, tx: 86, ty: 25, ms: 0.55, tracking: -0.025 },
].map(d => {
  const lettering = word(d.font, 'Terminal', d.th, d.tracking);
  return { id: d.id, width: d.tx + lettering.width, height: Math.max(d.ty + d.th, d.ms * 80), mark: [0, 0, d.ms], letters: at(lettering, d.tx, d.ty) };
});
// Edited after review at 24px: shallower steps, a readable smaller mark,
// and enough separation to keep the blue 1 clear of the T.
const finishStudies = [
  { id: '23-offset-finish', tx: 65, ty: 18, ms: 0.44, tracking: -0.025 },
  { id: '24-offset-quiet', tx: 61.5, ty: 20, ms: 0.41, tracking: -0.015 },
  { id: '25-offset-compact', tx: 64, ty: 12, ms: 0.44, tracking: -0.025 },
].map(d => {
  const lettering = word('PPTelegraf-Regular.otf', 'Terminal', 63, d.tracking);
  return { id: d.id, width: d.tx + lettering.width, height: d.ty + 63, mark: [0, 0, d.ms], letters: at(lettering, d.tx, d.ty) };
});
const five = [
  { id: '10-stack', width: 123, height: 112, mark: [0, 0, 1], letters: at(stacked, 0, 91, 123 / stacked.width) },
  { id: '11-condensed', width: 143 + condensed.width * 0.77, height: 80, mark: [0, 0, 1], letters: `<g transform="translate(143 0) scale(.77 1)">${condensed.paths}</g>` },
  { id: '12-editorial', width: 86 + editorial.width, height: 86, mark: [0, 0, 0.55], letters: at(editorial, 86, 23) },
  { id: '13-mono', width: 153 + mono.width, height: 80, mark: [0, 0, 1], letters: at(mono, 153, 15.5) },
  { id: '14-reverse', width: reverse.width + 81, height: 80, mark: [reverse.width + 19, 0, 0.5], letters: at(reverse, 0, 15) },
  ...offsetStudies,
  ...finishStudies,
  ...[0.9, 0.8, 0.7].map((factor, index) => ({
    id: `2${index}-offset-small`, width: 86 + editorial.width, height: 86,
    mark: [123 * 0.55 * (1 - factor), 0, 0.55 * factor],
    letters: at(editorial, 86, 23),
  })),
];
for (const d of five) {
  for (const theme of ['dark', 'light', 'mono']) {
    const ink = theme === 'light' ? '#111318' : '#f2f4f7';
    const [mx, my, ms] = d.mark;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d.width} ${d.height}" fill="${ink}" role="img" aria-label="X1 Terminal"><title>X1 Terminal — ${d.id}</title><defs><linearGradient id="blue" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#00c6ff"/><stop offset="1" stop-color="#0072ff"/></linearGradient></defs><g transform="translate(${mx} ${my}) scale(${ms})"><path d="${x}"/><path d="${one}" fill="${theme === 'mono' ? ink : 'url(#blue)'}"/></g>${d.letters}</svg>`;
    fs.writeFileSync(path.join(out, `${d.id}-${theme}.svg`), svg);
  }
}
console.log(`Wrote ${five.length * 3} SVGs for structural studies.`);
