// Tierlist "Wie is corrupt": eigen tierlist (bewaard in de browser) en de gezamenlijke uitslag via Supabase.
(function tierlist() {
  const rows = document.getElementById('tiers');
  if (!rows) return;

  const TIERS = [
    { n: 1, label: 'Zeker corrupt', color: '#e0506e' },
    { n: 2, label: 'Verdacht', color: '#c2478f' },
    { n: 3, label: 'Twijfel', color: '#8b4dff' },
    { n: 4, label: 'Vertrouw ik wel', color: '#4f86d9' },
    { n: 5, label: 'Zeker creator', color: '#d9a03a' }
  ];
  const cfg = window.CC_CONFIG || {};
  const real = Array.isArray(window.DEELNEMERS) ? window.DEELNEMERS.filter(d => d && d.naam) : [];
  const demo = real.length === 0;
  const keyOf = d => String(d.id || d.minecraft || d.naam).trim().toLowerCase().slice(0, 60);
  const people = demo
    ? Array.from({ length: 60 }, (_, i) => ({ key: 'demo-' + (i + 1), naam: '#' + (i + 1), mystery: true }))
    : real.map(d => ({ key: keyOf(d), naam: d.naam, minecraft: (d.minecraft || '').trim() }));
  const byKey = Object.fromEntries(people.map(p => [p.key, p]));
  const STORE = demo ? 'cc-tierlist-demo' : 'cc-tierlist';

  const msg = document.getElementById('tl-msg');
  const say = (text, error) => { msg.textContent = text; msg.classList.toggle('error', !!error); msg.hidden = false; };
  if (demo) document.getElementById('tl-demo').hidden = false;

  // Opgeslagen keuzes
  let state = {};
  try { state = JSON.parse(localStorage.getItem(STORE)) || {}; } catch { state = {}; }
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch {} };

  // Hoofdje voor een chip
  const headFor = p => {
    if (p.mystery) { const s = document.createElement('span'); s.className = 'chip-q'; s.textContent = '?'; return s; }
    if (/^[A-Za-z0-9_]{3,16}$/.test(p.minecraft)) {
      const img = new Image(); img.alt = ''; img.src = `https://mc-heads.net/avatar/${p.minecraft}/32`;
      img.onerror = () => img.replaceWith(pixelHead(p.naam));
      return img;
    }
    return pixelHead(p.naam);
  };

  // Label van een rij: pixel-blokje, naam en een corruptie-meter (meer blokjes = verdachter)
  function makeLabel(t) {
    const label = document.createElement('div');
    label.className = 'tier-label';
    const gem = document.createElement('span');
    gem.className = 'tier-gem';
    gem.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.className = 'tier-text';
    const name = document.createElement('span');
    name.className = 'tier-name';
    name.textContent = t.label;
    const meter = document.createElement('span');
    meter.className = 'tier-meter';
    meter.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 5; i++) { const b = document.createElement('i'); if (i < 6 - t.n) b.className = 'on'; meter.appendChild(b); }
    text.append(name, meter);
    label.append(gem, text);
    return label;
  }

  // Rijen bouwen
  const zones = {};
  TIERS.forEach(t => {
    const row = document.createElement('div');
    row.className = 'tier-row';
    row.style.setProperty('--tier', t.color);
    const label = makeLabel(t);
    const drop = document.createElement('div');
    drop.className = 'tier-drop';
    drop.dataset.tier = t.n;
    drop.tabIndex = 0;
    drop.setAttribute('aria-label', t.label);
    row.append(label, drop);
    rows.appendChild(row);
    zones[t.n] = drop;
  });
  zones[0] = document.getElementById('pool');

  // Chips
  let selected = null;
  const chips = {};
  people.forEach(p => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.draggable = true;
    b.dataset.key = p.key;
    const name = document.createElement('span');
    name.textContent = p.naam;
    b.append(headFor(p), name);
    b.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', p.key); e.dataTransfer.effectAllowed = 'move'; b.classList.add('dragging'); });
    b.addEventListener('dragend', () => b.classList.remove('dragging'));
    b.addEventListener('click', e => {
      e.stopPropagation();
      if (selected === p.key) { select(null); return; }
      select(p.key);
    });
    chips[p.key] = b;
  });

  function select(key) {
    if (selected && chips[selected]) chips[selected].classList.remove('selected');
    selected = key;
    document.body.classList.toggle('tl-picking', !!key);
    if (key) chips[key].classList.add('selected');
  }

  function move(key, tier) {
    if (!byKey[key]) return;
    if (tier) state[key] = tier; else delete state[key];
    save();
    place(key, true);
    updateCount();
  }

  function place(key, animate) {
    const chip = chips[key];
    zones[state[key] || 0].appendChild(chip);
    if (animate) { chip.classList.remove('landed'); void chip.offsetWidth; chip.classList.add('landed'); }
  }

  const poolCount = document.getElementById('pool-count');
  const updateCount = () => {
    const left = people.filter(p => !state[p.key]).length;
    poolCount.textContent = left ? `(${left})` : '';
  };

  Object.values(zones).forEach(z => {
    z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('over'); });
    z.addEventListener('dragleave', () => z.classList.remove('over'));
    z.addEventListener('drop', e => {
      e.preventDefault(); z.classList.remove('over');
      move(e.dataTransfer.getData('text/plain'), +z.dataset.tier);
    });
    const dropSelected = () => { if (selected) { move(selected, +z.dataset.tier); select(null); } };
    z.addEventListener('click', dropSelected);
    z.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dropSelected(); } });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') select(null); });

  people.forEach(p => place(p.key, false));
  updateCount();

  // Opnieuw beginnen
  document.getElementById('tl-reset').addEventListener('click', () => {
    if (!Object.keys(state).length) return;
    if (!confirm('Weet je zeker dat je opnieuw wilt beginnen? Je huidige tierlist wordt gewist.')) return;
    state = {}; save(); select(null);
    people.forEach(p => place(p.key, false));
    updateCount();
    say('Je tierlist is leeggemaakt.');
  });

  // Afbeelding downloaden: tierlist in dezelfde stijl als de site, op dubbele resolutie
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
  const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

  async function drawTierImage() {
    const S = 2, W = 1200, M = 48, LABEL = 270, CW = 178, CH = 46, GAP = 10, PAD = 14, ROWGAP = 12, MINH = 78;
    const inner = W - M * 2 - LABEL;
    const perRow = Math.max(1, Math.floor((inner - PAD * 2 + GAP) / (CW + GAP)));
    const groups = TIERS.map(t => people.filter(p => state[p.key] === t.n));
    const heights = groups.map(g => Math.max(MINH, Math.ceil(Math.max(g.length, 1) / perRow) * (CH + GAP) - GAP + PAD * 2));
    try { await document.fonts.ready; } catch {}
    const logo = await loadImg('img/logo.png');
    const HEAD = logo ? 230 : 120;
    const H = HEAD + heights.reduce((a, b) => a + b + ROWGAP, 0) - ROWGAP + 96;

    const c = document.createElement('canvas');
    c.width = W * S; c.height = H * S;
    const x = c.getContext('2d');
    x.scale(S, S);
    x.imageSmoothingEnabled = false;

    // Achtergrond: donkere pixelsteen met paarse glinsteringen en gloed bovenaan
    const r = rng('tier-bg');
    const stone = ['#09070d', '#0b0810', '#0d0a13', '#100c17', '#130e1c'];
    for (let py = 0; py < H; py += 8) for (let px = 0; px < W; px += 8) {
      x.fillStyle = stone[Math.floor(Math.pow(r(), 2) * stone.length)];
      x.fillRect(px, py, 8, 8);
      if (r() < 0.006) { x.fillStyle = r() < 0.5 ? '#6b3fd1' : '#a77bff'; x.fillRect(px + 2, py + 2, 4, 4); }
    }
    const glow = x.createRadialGradient(W / 2, 90, 10, W / 2, 90, 520);
    glow.addColorStop(0, 'rgba(139,77,255,.35)'); glow.addColorStop(1, 'rgba(139,77,255,0)');
    x.fillStyle = glow; x.fillRect(0, 0, W, H);

    // Kop: logo en titel
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    if (logo) {
      x.imageSmoothingEnabled = true;
      const lw = 330, lh = lw * logo.height / logo.width;
      x.shadowColor = 'rgba(139,77,255,.6)'; x.shadowBlur = 24;
      x.drawImage(logo, (W - lw) / 2, 22, lw, lh);
      x.shadowBlur = 0;
      x.imageSmoothingEnabled = false;
    }
    x.fillStyle = '#cfa9ff'; x.font = '600 15px "IBM Plex Mono", monospace';
    const sub = 'MIJN TIERLIST  ·  WIE IS CORRUPT?';
    x.fillText(sub.split('').join(String.fromCharCode(8202)), W / 2, HEAD - 22);
    x.textAlign = 'left';

    // Rijen
    let y = HEAD;
    TIERS.forEach((t, i) => {
      const h = heights[i], rx = M, rw = W - M * 2;
      // rij met gloed in de tierkleur
      x.shadowColor = rgba(t.color, .25); x.shadowBlur = 22;
      x.fillStyle = 'rgba(14,9,22,.94)'; x.fillRect(rx, y, rw, h);
      x.shadowBlur = 0;
      const wash = x.createLinearGradient(rx, 0, rx + rw * 0.45, 0);
      wash.addColorStop(0, rgba(t.color, .22)); wash.addColorStop(1, rgba(t.color, 0));
      x.fillStyle = wash; x.fillRect(rx, y, rw, h);
      x.strokeStyle = rgba(t.color, .5); x.lineWidth = 1; x.strokeRect(rx + .5, y + .5, rw - 1, h - 1);
      x.fillStyle = t.color; x.fillRect(rx, y, 4, h);
      x.fillStyle = rgba(t.color, .3); x.fillRect(rx + LABEL, y, 1, h);

      // pixelblokje
      const gx = rx + 22, gy = y + h / 2 - 17, gs = 34;
      x.fillStyle = '#000'; x.fillRect(gx - 2, gy - 2, gs + 4, gs + 4);
      x.shadowColor = rgba(t.color, .8); x.shadowBlur = 16;
      x.fillStyle = t.color; x.fillRect(gx, gy, gs, gs);
      x.shadowBlur = 0;
      x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(gx, gy, gs, 4); x.fillRect(gx, gy, 4, gs);
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(gx, gy + gs - 4, gs, 4); x.fillRect(gx + gs - 4, gy, 4, gs);

      // naam en meter
      const tx = gx + gs + 18;
      x.fillStyle = '#fff'; x.font = '800 21px Archivo, sans-serif'; x.textBaseline = 'alphabetic';
      x.fillText(t.label.toUpperCase(), tx, y + h / 2 + 1, LABEL - (tx - rx) - 12);
      for (let k = 0; k < 5; k++) {
        const on = k < 6 - t.n;
        x.fillStyle = on ? t.color : 'rgba(255,255,255,.12)';
        if (on) { x.shadowColor = rgba(t.color, .9); x.shadowBlur = 6; }
        x.fillRect(tx + k * 14, y + h / 2 + 11, 11, 6);
        x.shadowBlur = 0;
      }

      // deelnemers
      groups[i].forEach((p, j) => {
        const cx = rx + LABEL + PAD + (j % perRow) * (CW + GAP), cy = y + PAD + Math.floor(j / perRow) * (CH + GAP);
        x.fillStyle = '#21172f'; x.fillRect(cx, cy, CW, CH);
        x.strokeStyle = rgba(t.color, .65); x.lineWidth = 1; x.strokeRect(cx + .5, cy + .5, CW - 1, CH - 1);
        x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(cx + 1, cy + 1, CW - 2, 1);
        const hs = 34, hx = cx + 6, hy = cy + (CH - hs) / 2;
        x.fillStyle = '#1b1228'; x.fillRect(hx, hy, hs, hs);
        if (p.mystery) {
          x.fillStyle = '#cfa9ff'; x.font = '900 20px Archivo, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
          x.fillText('?', hx + hs / 2, hy + hs / 2 + 1); x.textAlign = 'left';
        } else {
          x.drawImage(pixelHead(p.minecraft || p.naam), hx, hy, hs, hs);
        }
        x.fillStyle = '#f6f1ff'; x.font = '600 16px "IBM Plex Sans", sans-serif'; x.textBaseline = 'middle';
        x.fillText(p.naam, hx + hs + 10, cy + CH / 2 + 1, CW - hs - 26);
      });
      y += h + ROWGAP;
    });

    // Voetregel
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillStyle = '#f6f1ff'; x.font = '900 16px Archivo, sans-serif';
    x.fillText('CREATOR CORRUPT', W / 2, H - 46);
    x.fillStyle = '#b9aecb'; x.font = '500 14px "IBM Plex Sans", sans-serif';
    x.fillText('Maak je eigen tierlist op ' + location.host + location.pathname.replace(/[^/]*$/, '') + 'tierlist.html', W / 2, H - 24);
    return c;
  }

  const imgBtn = document.getElementById('tl-image');
  imgBtn.addEventListener('click', async () => {
    imgBtn.disabled = true;
    try {
      const c = await drawTierImage();
      const blob = await new Promise(res => c.toBlob(res, 'image/png'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'creator-corrupt-tierlist.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      say('Downloaden lukte niet. Probeer het opnieuw.', true);
    } finally {
      imgBtn.disabled = false;
    }
  });

  // Insturen naar Supabase
  const hasDb = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const api = path => cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/' + path;
  const headers = { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + cfg.supabaseAnonKey };
  const voter = () => {
    let id = null;
    try { id = localStorage.getItem('cc-voter'); } catch {}
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => { const r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 3 | 8)).toString(16); }));
      try { localStorage.setItem('cc-voter', id); } catch {}
    }
    return id;
  };

  const send = document.getElementById('tl-send');
  if (demo) send.disabled = true;
  send.addEventListener('click', async () => {
    if (demo) return;
    if (!hasDb) { say('Insturen is nog niet geopend. Je tierlist is wel bewaard in je browser.'); return; }
    const picks = people.filter(p => state[p.key]).map(p => ({ stemmer: voter(), deelnemer: p.key, tier: state[p.key] }));
    if (!picks.length) { say('Zet eerst minstens één deelnemer in een rij.', true); return; }
    send.disabled = true;
    try {
      const res = await fetch(api('tier_stemmen'), { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(picks) });
      if (!res.ok) throw new Error(res.status);
      say(`Bedankt! Je keuze voor ${picks.length} deelnemer${picks.length === 1 ? '' : 's'} is ingestuurd.`);
      loadCommunity();
    } catch {
      say('Insturen lukte niet. Probeer het later opnieuw.', true);
    } finally {
      send.disabled = false;
    }
  });

  // Gezamenlijke uitslag
  const community = document.getElementById('community');
  function showCommunityMessage(text) {
    community.replaceChildren(Object.assign(document.createElement('p'), { className: 'community-empty', textContent: text }));
  }
  async function loadCommunity() {
    if (demo) { showCommunityMessage('Zodra de deelnemers bekend zijn en er gestemd is, zie je hier wat iedereen denkt.'); return; }
    if (!hasDb) { showCommunityMessage('De gezamenlijke tierlist verschijnt hier zodra insturen geopend is.'); return; }
    try {
      const res = await fetch(api('tier_resultaten?select=deelnemer,gemiddelde,stemmen'), { headers });
      if (!res.ok) throw new Error(res.status);
      const data = (await res.json()).filter(r => byKey[r.deelnemer]);
      if (!data.length) { showCommunityMessage('Er is nog niet gestemd. Stuur als eerste je tierlist in!'); return; }
      const wrap = document.createElement('div');
      wrap.className = 'tiers tiers-community';
      TIERS.forEach(t => {
        const row = document.createElement('div');
        row.className = 'tier-row';
        row.style.setProperty('--tier', t.color);
        const label = makeLabel(t);
        const drop = document.createElement('div');
        drop.className = 'tier-drop';
        data.filter(r => Math.min(5, Math.max(1, Math.round(+r.gemiddelde))) === t.n)
          .sort((a, b) => a.gemiddelde - b.gemiddelde)
          .forEach(r => {
            const p = byKey[r.deelnemer];
            const chip = document.createElement('span');
            chip.className = 'chip chip-static';
            const name = document.createElement('span');
            name.textContent = p.naam;
            const votes = document.createElement('small');
            votes.textContent = `${r.stemmen}×`;
            chip.title = `Gemiddelde ${(+r.gemiddelde).toFixed(1)} uit ${r.stemmen} stem${r.stemmen == 1 ? '' : 'men'}`;
            chip.append(headFor(p), name, votes);
            drop.appendChild(chip);
          });
        row.append(label, drop);
        wrap.appendChild(row);
      });
      community.replaceChildren(wrap);
    } catch {
      showCommunityMessage('De gezamenlijke tierlist kon niet geladen worden. Probeer het later opnieuw.');
    }
  }
  loadCommunity();
})();
