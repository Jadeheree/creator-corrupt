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

// Texturen voor de videoplaceholder, de gouden lijsten en de perkamenten naambordjes
const rootStyle = document.documentElement.style;
rootStyle.setProperty('--obsidian', `url(${texture('obsidian', ['#0b090f', '#0d0a12', '#100c16', '#140f1c', '#1b1327', '#261a38'])})`);
rootStyle.setProperty('--tex-gold', `url(${texture('gold', ['#e9b443', '#dca23a', '#f3c75a', '#c98d2a', '#f8da7a'])})`);
rootStyle.setProperty('--tex-parchment', `url(${texture('parchment', ['#e8d4a2', '#dfc890', '#efdfb4', '#d2b97c', '#e4cd97'])})`);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Grot-achtergrond in pixelstijl: donkere steen, rode ranken en paarse bliksem.
// Getekend op lage resolutie en opgeschaald, zodat elke "pixel" een blokje is.
const CELL = 7;
// Hoogte van het scherm (niet van het venster), zodat de achtergrond niet verspringt als de adresbalk op mobiel in- en uitklapt
const caveSize = () => [Math.ceil(innerWidth / CELL), Math.ceil(Math.max(innerHeight, screen.height) / CELL)];
let caveW = 0;
function drawCave() {
  const cv = document.getElementById('cave');
  if (!cv) return;
  const [w, h] = caveSize();
  if (w === caveW) return;
  caveW = w;
  cv.width = w; cv.height = h;
  cv.style.height = h * CELL + 'px';
  const ctx = cv.getContext('2d');
  const r = rng('cave' + w);

  // Hoe ver van het midden: ranken en bliksem vooral aan de randen, zodat tekst leesbaar blijft
  const edge = x => Math.min(1, Math.abs(x - w / 2) / (w / 2) * 1.5);

  // Steen
  const stone = ['#09070d', '#0b0810', '#0d0a13', '#100c17', '#130e1c'];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    ctx.fillStyle = stone[Math.floor(Math.pow(r(), 2) * stone.length)];
    ctx.fillRect(x, y, 1, 1);
  }

  // Rode ranken (random walk naar beneden, met zijtakken)
  const red = ['#2a0810', '#370b16', '#47101d', '#5c1526'];
  const vine = (x, y, len, depth) => {
    for (let i = 0; i < len && y < h; i++) {
      const a = 0.08 + 0.72 * Math.pow(edge(x), 1.6);
      ctx.globalAlpha = a;
      ctx.fillStyle = red[Math.floor(r() * red.length)];
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      y += r() < 0.8 ? 1 : 0;
      x += r() < 0.3 ? -1 : r() < 0.43 ? 1 : 0;
      if (depth < 2 && r() < 0.025) vine(x, y, len * 0.45, depth + 1);
    }
  };
  const vines = Math.max(6, Math.round(w / 18));
  for (let i = 0; i < vines; i++) {
    const x = r() < 0.5 ? r() * w * 0.22 : w - r() * w * 0.22;
    vine(x, r() * h * 0.15, h * (0.25 + r() * 0.4), 0);
  }
  ctx.globalAlpha = 1;

  // Paarse bliksem vanuit de onderhoeken
  const bolt = (x, y, dx, steps) => {
    const pts = [];
    for (let i = 0; i < steps; i++) {
      pts.push([x, y]);
      // Schuin omhoog in zigzag: soms opzij, soms omhoog
      if (r() < 0.55) y -= 1;
      x += r() < 0.7 ? dx : -dx;
      if (r() < 0.04 && steps > 16) bolt(x, y, r() < .5 ? dx : -dx, Math.round(steps * 0.35));
    }
    ctx.shadowColor = '#8f4dff'; ctx.shadowBlur = 6;
    ctx.fillStyle = 'rgba(123,63,208,.35)';
    pts.forEach(([px, py]) => ctx.fillRect(px, py - 1, 1, 3));
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#c9a2ff';
    pts.forEach(([px, py]) => ctx.fillRect(px, py, 1, 1));
  };
  bolt(0, Math.round(h * 0.92), 1, Math.round(w * 0.26));
  bolt(w - 1, Math.round(h * 0.86), -1, Math.round(w * 0.3));

  // Amethist-glinsteringen
  for (let i = 0; i < w * h / 600; i++) {
    const x = Math.floor(r() * w), y = Math.floor(r() * h);
    ctx.globalAlpha = 0.3 + 0.7 * edge(x);
    ctx.fillStyle = r() < 0.5 ? '#9a5cf0' : '#c9a2ff';
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

// Zwevende paarse deeltjes
function startSparks() {
  const cv = document.getElementById('sparks');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let w, h, parts = [];
  const size = () => {
    const [nw, nh] = caveSize();
    if (nw === w) return;
    w = cv.width = nw; h = cv.height = nh;
    cv.style.height = h * CELL + 'px';
    parts =Array.from({ length: Math.round(w * h / 300) }, () => ({ x: Math.random() * w, y: Math.random() * h, v: 0.02 + Math.random() * 0.05, p: Math.random() * 6.28 }));
  };
  const frame = t => {
    ctx.clearRect(0, 0, w, h);
    for (const s of parts) {
      s.y -= s.v; s.x += Math.sin(t / 1800 + s.p) * 0.01;
      if (s.y < -1) { s.y = h + 1; s.x = Math.random() * w; }
      const a = 0.35 + 0.65 * Math.abs(Math.sin(t / 900 + s.p));
      ctx.fillStyle = `rgba(201,162,255,${a})`;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }
    if (!reduceMotion) requestAnimationFrame(frame);
  };
  size();
  addEventListener('resize', size);
  requestAnimationFrame(frame);
}

drawCave();
startSparks();
let caveTimer;
addEventListener('resize', () => { clearTimeout(caveTimer); caveTimer = setTimeout(drawCave, 150); });

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

// Uitlegvideo: toont de YouTube-video als data-youtube is ingevuld, anders blijft de placeholder staan
document.querySelectorAll('.video[data-youtube]').forEach(el => {
  const id = el.dataset.youtube.trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
  iframe.title = 'Uitlegvideo Creator Corrupt';
  iframe.allow = 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
  iframe.allowFullscreen = true;
  iframe.loading = 'lazy';
  el.replaceChildren(iframe);
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

// Aanmeldformulier: controleert de velden en slaat de aanmelding op in Supabase (sleutels in config.js)
const form = document.getElementById('aanmelden');
if (form) {
  const cfg = window.CC_CONFIG || {};
  const msg = form.querySelector('.form-msg');
  const show = (text, error) => { msg.textContent = text; msg.classList.toggle('error', !!error); msg.hidden = false; };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fields = [...form.querySelectorAll('input:not([name=website])')];
    fields.forEach(f => f.classList.toggle('invalid', !f.checkValidity()));
    const firstBad = fields.find(f => !f.checkValidity());
    if (firstBad) { show('Vul alle verplichte velden goed in.', true); firstBad.focus(); return; }

    // Spambot heeft het verborgen veld ingevuld: doe alsof het gelukt is
    if (form.website.value) { form.reset(); show('Bedankt! Je aanmelding is binnen.'); return; }

    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) { show('Aanmelden is nog niet geopend. Je aanmelding is niet verstuurd.'); return; }

    const data = {
      naam: form.naam.value.trim(),
      minecraft: form.minecraft.value.trim(),
      discord: form.discord.value.trim(),
      email: form.email.value.trim(),
      kanaal: form.kanaal.value.trim(),
      microfoon: form.microfoon.checked,
      camera: form.camera.checked,
      voorwaarden_akkoord: form.regels.checked,
      voorwaarden_versie: cfg.voorwaardenVersie || ''
    };

    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      const res = await fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/aanmeldingen', {
        method: 'POST',
        headers: {
          apikey: cfg.supabaseAnonKey,
          Authorization: 'Bearer ' + cfg.supabaseAnonKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(data)
      });
      if (res.status === 409) { show('Met deze Minecraft-naam of dit e-mailadres is al iemand aangemeld.', true); return; }
      if (!res.ok) throw new Error(res.status);
      form.reset();
      show('Bedankt! Je aanmelding is binnen. We nemen contact met je op via Discord.');
    } catch {
      show('Versturen lukte niet. Probeer het later opnieuw.', true);
    } finally {
      btn.disabled = false;
    }
  });

  form.addEventListener('input', e => e.target.classList.remove('invalid'));
}
