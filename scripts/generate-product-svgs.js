const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'public', 'images', 'products');

const products = [
    { file: 'pixel.svg', label: 'Google Pixel 8', accent: '#34d399', bg: ['#059669', '#047857'] },
    { file: 'thinkpad.svg', label: 'ThinkPad X1', accent: '#94a3b8', bg: ['#334155', '#1e293b'] },
    { file: 'rog-laptop.svg', label: 'ROG Zephyrus', accent: '#f87171', bg: ['#7f1d1d', '#450a0a'] },
    { file: 'jbl-headphones.svg', label: 'JBL Tune 760', accent: '#fbbf24', bg: ['#b45309', '#78350f'] },
    { file: 'xbox.svg', label: 'Xbox Series X', accent: '#86efac', bg: ['#166534', '#14532d'] },
    { file: 'switch.svg', label: 'Switch OLED', accent: '#fca5a5', bg: ['#dc2626', '#991b1b'] },
    { file: 'ipad.svg', label: 'iPad Pro', accent: '#c4b5fd', bg: ['#6d28d9', '#4c1d95'] },
    { file: 'galaxy-tab.svg', label: 'Galaxy Tab S9', accent: '#93c5fd', bg: ['#1d4ed8', '#1e3a8a'] },
    { file: 'pad-6.svg', label: 'Xiaomi Pad 6', accent: '#fdba74', bg: ['#ea580c', '#9a3412'] },
    { file: 'watch-ultra.svg', label: 'Watch Ultra', accent: '#fde68a', bg: ['#ca8a04', '#854d0e'] },
    { file: 'galaxy-watch.svg', label: 'Galaxy Watch', accent: '#67e8f9', bg: ['#0e7490', '#164e63'] },
    { file: 'garmin-watch.svg', label: 'Garmin Fenix', accent: '#86efac', bg: ['#15803d', '#14532d'] },
    { file: 'tv-samsung.svg', label: 'Samsung QLED', accent: '#93c5fd', bg: ['#1e40af', '#172554'] },
    { file: 'tv-lg.svg', label: 'LG OLED C3', accent: '#f9a8d4', bg: ['#be185d', '#831843'] },
    { file: 'tv-sony.svg', label: 'Sony Bravia', accent: '#fcd34d', bg: ['#a16207', '#713f12'] },
    { file: 'magsafe.svg', label: 'MagSafe', accent: '#e2e8f0', bg: ['#475569', '#1e293b'] },
    { file: 'usb-hub.svg', label: 'USB-C Hub', accent: '#a5b4fc', bg: ['#4338ca', '#312e81'] },
    { file: 'powerbank.svg', label: 'Power Bank', accent: '#fda4af', bg: ['#e11d48', '#9f1239'] }
];

function makeSvg({ label, accent, bg }) {
    const [c1, c2] = bg;
    const short = label.length > 14 ? label.split(' ')[0] : label;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="100%" style="stop-color:${c2}"/>
    </linearGradient>
  </defs>
  <rect width="600" height="450" fill="url(#bg)"/>
  <rect x="170" y="95" width="260" height="220" rx="28" fill="rgba(15,23,42,0.35)" stroke="${accent}" stroke-width="4"/>
  <rect x="205" y="135" width="190" height="140" rx="16" fill="rgba(15,23,42,0.55)"/>
  <text x="300" y="210" text-anchor="middle" fill="${accent}" font-size="42" font-family="Arial,sans-serif" font-weight="bold">${short}</text>
  <text x="300" y="420" text-anchor="middle" fill="#fff" font-size="26" font-family="Arial,sans-serif" font-weight="bold">${label}</text>
</svg>
`;
}

fs.mkdirSync(outputDir, { recursive: true });

for (const item of products) {
    const filePath = path.join(outputDir, item.file);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, makeSvg(item), 'utf8');
        console.log(`Создан: ${item.file}`);
    } else {
        console.log(`Уже есть: ${item.file}`);
    }
}

console.log('Готово');
