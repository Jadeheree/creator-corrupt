// Kleine seeded random, zodat texturen en avatars elke keer hetzelfde zijn
function rng(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tekent een 16x16 pixeltextuur en geeft een data-URL terug
function texture(seed, colors, size = 16) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const r = rng(seed);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      ctx.fillStyle = colors[Math.floor(Math.pow(r(), 1.6) * colors.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c.toDataURL();
}

// Achtergrond achter het logo: donker obsidiaan-achtig
const obsidian = texture('obsidian', ['#0b090f', '#0d0a12', '#100c16', '#140f1c', '#1b1327', '#261a38']);
document.documentElement.style.setProperty('--obsidian', `url(${obsidian})`);

// Team-avatars: Minecraft-skin als er een naam is ingevuld, anders een gegenereerd pixelhoofd
function pixelHead(name) {
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const ctx = c.getContext('2d');
  const r = rng(name);
  const hue = Math.floor(r() * 360);
  const skin = ['#c99a78', '#a8785a', '#e2b694', '#7a5238'][Math.floor(r() * 4)];
  const hair = `hsl(${hue} 35% ${15 + r() * 20}%)`;
  const eye = `hsl(${260 + r() * 40} 70% 60%)`;
  ctx.fillStyle = skin; ctx.fillRect(0, 0, 8, 8);
  ctx.fillStyle = hair; ctx.fillRect(0, 0, 8, 2);
  ctx.fillRect(0, 2, 1, 2 + Math.floor(r() * 3)); ctx.fillRect(7, 2, 1, 2 + Math.floor(r() * 3));
  ctx.fillStyle = '#fff'; ctx.fillRect(1, 4, 2, 1); ctx.fillRect(5, 4, 2, 1);
  ctx.fillStyle = eye; ctx.fillRect(2, 4, 1, 1); ctx.fillRect(5, 4, 1, 1);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(3, 6, 2, 1);
  return c;
}

document.querySelectorAll('.avatar').forEach(el => {
  const mc = el.dataset.mc.trim();
  if (mc) {
    const img = new Image();
    img.alt = mc;
    img.src = `https://mc-heads.net/avatar/${encodeURIComponent(mc)}/64`;
    img.onerror = () => img.replaceWith(pixelHead(mc));
    el.appendChild(img);
  } else {
    el.appendChild(pixelHead(el.dataset.name || 'speler'));
  }
});

// IP kopiëren
document.querySelectorAll('[data-copy]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const text = document.querySelector(btn.dataset.copy).textContent;
    try { await navigator.clipboard.writeText(text); btn.textContent = 'Gekopieerd'; }
    catch { btn.textContent = 'Lukt niet'; }
    setTimeout(() => (btn.textContent = 'Kopieer'), 1800);
  });
});

// Mobiel menu
const menu = document.querySelector('.menu');
const nav = document.getElementById('nav');
menu.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menu.setAttribute('aria-expanded', open);
});
nav.addEventListener('click', e => {
  if (e.target.tagName === 'A') { nav.classList.remove('open'); menu.setAttribute('aria-expanded', false); }
});

document.getElementById('year').textContent = new Date().getFullYear();
