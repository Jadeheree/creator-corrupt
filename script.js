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

document.querySelectorAll('.avatar[data-mc]').forEach(el => {
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

// Pop-ups met grapjes over het creator-leven en corrupted zijn, met een geanimeerd pixelpoppetje.
// Alleen op de voorpagina. Eerst na 20 seconden, daarna af en toe, maximaal 4 per bezoek.
const jokes = [
  { type: 'creator', text: "Je zegt al twintig minuten 'nog één ronde'. Chat gelooft je niet meer." },
  { type: 'creator', text: 'Volgersdoel: 100. Huidige stand: 97. Twee daarvan zijn je eigen alts.' },
  { type: 'creator', text: 'Je praat al een uur tegen chat. Je microfoon stond op mute.' },
  { type: 'creator', text: 'Je hebt zelf een clip van jezelf gemaakt. Niemand anders deed het.' },
  { type: 'corrupt', text: "Chat typt 'sus'. Chat weet het ook niet." },
  { type: 'corrupt', text: 'Je teammate kijkt je al drie minuten aan zonder iets te zeggen. Normaal toch?' },
  { type: 'corrupt', text: 'Corrupted? Ik? Ik heb gewoon slechte wifi.' },
  { type: 'corrupt', text: 'Even je camera checken... ogen nog normaal? Mooi zo.' },
  { type: 'corrupt', text: 'Iemand heeft je diamanten gepakt. Corrupted, of gewoon je beste vriend?' },
  { type: 'corrupt', text: 'Niemand weet wat jij bent. Jij ook niet helemaal, toch?' }
];

// Pixelpoppetje (16x16) met drie animaties: knipperen, corruption die zich verspreidt, en glitchen
function sprite(canvas, mode) {
  const ctx = canvas.getContext('2d');
  const r = rng(mode + Math.random());
  const skin = ['#c99a78', '#e2b694', '#a8785a'][Math.floor(r() * 3)];
  const hair = ['#3b2a1a', '#6b4a1c', '#1d1d24', '#8a5a2a'][Math.floor(r() * 4)];
  const purple = ['#5b2aa6', '#8b4dff', '#c9a2ff'];
  const spread = Array.from({ length: 144 }, (_, i) => i).sort(() => r() - 0.5);
  let f = 0;

  const head = (eyes, closed) => {
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = skin; ctx.fillRect(2, 2, 12, 12);
    ctx.fillStyle = hair; ctx.fillRect(2, 2, 12, 3); ctx.fillRect(2, 5, 1, 3); ctx.fillRect(13, 5, 1, 3);
    if (closed) { ctx.fillStyle = '#7a5238'; ctx.fillRect(4, 8, 2, 1); ctx.fillRect(10, 8, 2, 1); }
    else {
      ctx.fillStyle = '#fff'; ctx.fillRect(4, 8, 2, 1); ctx.fillRect(10, 8, 2, 1);
      ctx.fillStyle = eyes; ctx.fillRect(5, 8, 1, 1); ctx.fillRect(10, 8, 1, 1);
    }
    ctx.fillStyle = '#6b3a2a'; ctx.fillRect(7, 11, 2, 1);
  };

  const draw = () => {
    if (mode === 'blink') {
      const t = f % 24;
      head('#4a7bd6', t === 10 || t === 11);
      // zweetdruppel
      const d = f % 32;
      if (d > 14) { ctx.fillStyle = '#7fd3ff'; ctx.fillRect(13, 4 + Math.min(d - 15, 8), 1, 2); }
    } else if (mode === 'corrupt') {
      const t = f % 48;
      const n = t < 8 ? 0 : t < 32 ? Math.floor((t - 8) / 24 * 60) : 60;
      head(n > 20 ? '#c9a2ff' : '#4a7bd6', false);
      for (let i = 0; i < n; i++) {
        const p = spread[i];
        ctx.fillStyle = purple[p % 3];
        ctx.fillRect(2 + (p % 12), 2 + Math.floor(p / 12), 1, 1);
      }
      if (n > 20) { ctx.fillStyle = '#fff'; ctx.fillRect(5, 8, 1, 1); ctx.fillRect(10, 8, 1, 1); }
    } else {
      head('#c9a2ff', false);
      if (f % 6 < 2) {
        const img = ctx.getImageData(0, 0, 16, 16);
        ctx.clearRect(0, 0, 16, 16);
        ctx.putImageData(img, 0, 0);
        const y = 3 + Math.floor(r() * 10), dx = r() < .5 ? -2 : 2;
        const slice = ctx.getImageData(0, y, 16, 2);
        ctx.putImageData(slice, dx, y);
        ctx.fillStyle = 'rgba(224,80,110,.7)'; ctx.fillRect(1, y, 1, 2);
        ctx.fillStyle = 'rgba(139,77,255,.7)'; ctx.fillRect(14, y, 1, 2);
      }
    }
    f++;
  };
  draw();
  if (reduceMotion) return () => {};
  const id = setInterval(draw, 125);
  return () => clearInterval(id);
}

function startPopups() {
  if (!document.querySelector('.hero')) return;
  try { if (localStorage.getItem('cc-popups-off') === '1') return; } catch {}

  const order = jokes.slice().sort(() => Math.random() - 0.5);
  let shown = 0, stop = null, hideTimer = null, nextTimer = null;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = '<canvas width="16" height="16" aria-hidden="true"></canvas><div><span class="toast-label"></span><p class="toast-text"></p><button class="toast-mute" type="button">Niet meer tonen</button></div><button class="toast-close" type="button" aria-label="Sluiten">&times;</button>';
  document.body.appendChild(toast);
  const canvas = toast.querySelector('canvas');

  const hide = () => {
    toast.classList.remove('show');
    clearTimeout(hideTimer);
    setTimeout(() => { if (stop) { stop(); stop = null; } }, 500);
  };
  const schedule = delay => { clearTimeout(nextTimer); if (shown < 4) nextTimer = setTimeout(show, delay); };

  function show() {
    const j = order[shown % order.length];
    shown++;
    const corrupt = j.type === 'corrupt';
    toast.classList.toggle('corrupt', corrupt);
    toast.querySelector('.toast-label').textContent = corrupt ? 'Corruption-melding' : 'Creator-leven';
    toast.querySelector('.toast-text').textContent = j.text;
    if (stop) stop();
    stop = sprite(canvas, corrupt ? (Math.random() < 0.5 ? 'corrupt' : 'glitch') : 'blink');
    toast.classList.add('show');
    hideTimer = setTimeout(hide, 9000);
    schedule(50000 + Math.random() * 30000);
  }

  toast.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  toast.addEventListener('mouseleave', () => { if (toast.classList.contains('show')) hideTimer = setTimeout(hide, 4000); });
  toast.querySelector('.toast-close').addEventListener('click', hide);
  toast.querySelector('.toast-mute').addEventListener('click', () => {
    try { localStorage.setItem('cc-popups-off', '1'); } catch {}
    clearTimeout(nextTimer);
    hide();
  });

  schedule(20000);
}
startPopups();

// Achtergrondmuziek: rustige ambient-muziek die de browser zelf maakt (Web Audio).
// Geen bestaand nummer, dus geen auteursrecht. Staat standaard uit; de bezoeker zet hem aan met de knop.
const music = (() => {
  let ac, master, wet, timers = [], playing = false, chordIndex = 0;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  // Rustige akkoorden: Cmaj7, Am7, Fmaj7, G6
  const chords = [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 64]];
  const melody = [72, 74, 76, 79, 81, 83, 84, 86, 88];

  function setup() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = 0;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    master.connect(lp).connect(ac.destination);
    // Galm: zelfgemaakte impulsrespons van uitstervende ruis
    const len = ac.sampleRate * 4, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    const verb = ac.createConvolver(); verb.buffer = ir;
    wet = ac.createGain(); wet.gain.value = 0.6;
    wet.connect(verb).connect(master);
  }

  function tone(note, when, { type = 'triangle', gain = 0.08, attack = 0.01, release = 2.5 } = {}) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = midi(note);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + attack + release);
    o.connect(g); g.connect(master); g.connect(wet);
    o.start(when); o.stop(when + attack + release + 0.1);
  }

  function chordLoop() {
    if (!playing) return;
    const t = ac.currentTime + 0.05;
    chords[chordIndex % chords.length].forEach((n, i) => tone(n, t + i * 0.08, { type: 'sine', gain: 0.045, attack: 2, release: 7 }));
    chordIndex++;
    timers.push(setTimeout(chordLoop, 8000));
  }

  function melodyLoop() {
    if (!playing) return;
    if (Math.random() < 0.7) {
      const chord = chords[(chordIndex + chords.length - 1) % chords.length].map(n => n % 12);
      const fits = melody.filter(n => chord.includes(n % 12) || Math.random() < 0.25);
      const n = fits[Math.floor(Math.random() * fits.length)];
      tone(n, ac.currentTime + 0.05, { gain: 0.07 });
      tone(n + 12, ac.currentTime + 0.05, { type: 'sine', gain: 0.015, release: 1.5 });
    }
    timers.push(setTimeout(melodyLoop, 1200 + Math.random() * 2600));
  }

  return {
    get playing() { return playing; },
    start() {
      if (playing) return;
      if (!ac) setup();
      ac.resume();
      playing = true;
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.linearRampToValueAtTime(0.35, ac.currentTime + 3);
      chordLoop(); timers.push(setTimeout(melodyLoop, 2500));
    },
    stop() {
      if (!playing) return;
      playing = false;
      timers.forEach(clearTimeout); timers = [];
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.setValueAtTime(master.gain.value, ac.currentTime);
      master.gain.linearRampToValueAtTime(0, ac.currentTime + 1.2);
      setTimeout(() => { if (!playing) ac.suspend(); }, 1400);
    }
  };
})();

(function musicButton() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'music-btn';
  btn.setAttribute('aria-pressed', 'false');
  btn.innerHTML = '<span class="bars" aria-hidden="true"><i></i><i></i><i></i></span><span class="music-label">Muziek aan</span>';
  document.body.appendChild(btn);
  const label = btn.querySelector('.music-label');
  const save = v => { try { localStorage.setItem('cc-music', v); } catch {} };
  const update = () => {
    btn.setAttribute('aria-pressed', String(music.playing));
    label.textContent = music.playing ? 'Muziek uit' : 'Muziek aan';
  };
  // Had de bezoeker de muziek aan staan? Dan start hij weer bij de eerste klik of toets (browsers vereisen dat).
  const stopWaiting = () => { removeEventListener('pointerdown', resume); removeEventListener('keydown', resume); };
  function resume(e) {
    if (e.target.closest && e.target.closest('.music-btn')) return;
    stopWaiting();
    music.start(); update();
  }
  btn.addEventListener('click', () => {
    stopWaiting();
    if (music.playing) { music.stop(); save('off'); } else { music.start(); save('on'); }
    update();
  });
  let wanted = false;
  try { wanted = localStorage.getItem('cc-music') === 'on'; } catch {}
  if (wanted) { addEventListener('pointerdown', resume); addEventListener('keydown', resume); }
})();

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
