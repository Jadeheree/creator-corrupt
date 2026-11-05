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
