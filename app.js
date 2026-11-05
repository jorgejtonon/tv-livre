/* TV Livre 3.0 — player de TV ao vivo (HLS + YouTube) com troca automática de fontes */
(() => {
  'use strict';

  const CAT = window.TV_CATALOG;
  const VERSION = '3.0.0';
  const UPDATE_URLS = {
    iptvorg: 'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/br.m3u',
    freetv: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/lists/brazil.md'
  };
  const DAY = 864e5;
  const START_TIMEOUT = 20000;
  const $ = (s, r = document) => r.querySelector(s);
  const svgNS = 'http://www.w3.org/2000/svg';

  /* ---------------- utilidades ---------------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('tvl.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('tvl.' + k, JSON.stringify(v)); } catch { /* armazenamento indisponível */ } }
  };
  function h(tag, props, ...kids) {
    const n = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'style') n.style.cssText = v;
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) { if (c == null || c === false) continue; n.append(c.nodeType ? c : String(c)); }
    return n;
  }
  function icon(id) { const s = document.createElementNS(svgNS, 'svg'); s.setAttribute('class', 'i'); s.setAttribute('aria-hidden', 'true'); const u = document.createElementNS(svgNS, 'use'); u.setAttribute('href', '#i-' + id); s.append(u); return s; }
  const pad = n => String(n).padStart(2, '0');
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const srcKey = s => s.type === 'youtube' ? 'yt:' + s.video : s.url;
  const hashHue = s => { let x = 0; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) % 360; return x; };
  let toastTimer;
  function toast(msg, ms = 3200) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms); }

  /* ---------------- regra de fontes (mesma da curadoria) ---------------- */
  const BLOCKED = /nxplay|cdntvms|satlabs|tvmatic|duckdns|token=|_sat[\/._]|_tk\/|-lh\.akamaihd\.net\/i\//i;
  function allowedUrl(u) {
    try {
      const x = new URL(u);
      if (x.protocol !== 'https:') return false;
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(x.hostname) || x.hostname.startsWith('[')) return false;
      return !BLOCKED.test(u);
    } catch { return false; }
  }

  /* ---------------- estado ---------------- */
  let channels = [];
  let byId = new Map();
  let status = store.get('status', {});          // chave da fonte -> { ok, t, note }
  const favs = new Set(store.get('favs', []));
  const prefSrc = store.get('pref', {});        // canal -> chave da fonte que funcionou por último
  const testing = new Set();
  const ORIGIN = { oficial: 'Oficial', afiliada: 'Afiliada', fast: 'Canal oficial grátis', publica: 'Pública', comunidade: 'Lista comunitária', usuario: 'Sua lista' };
  const STATUS_LABEL = { ok: 'No ar', down: 'Fora do ar', ext: 'Só no app oficial', test: 'Testando…', unk: 'Não testado' };

  function saveStatus() { store.set('status', status); }
  function setStatus(key, ok, note) { if (typeof ok !== 'boolean') return; status[key] = { ok, t: Date.now(), note: note || '' }; saveStatus(); }
  function fresh(key) { const s = status[key]; return s && Date.now() - s.t < 7 * DAY; }
  function chStatus(ch) {
    if (!ch.sources.length) return 'ext';
    const keys = ch.sources.map(srcKey);
    if (keys.some(k => testing.has(k))) return 'test';
    if (keys.some(k => fresh(k) && status[k].ok)) return 'ok';
    if (keys.every(k => fresh(k) && status[k].ok === false)) return 'down';
    return 'unk';
  }

  function buildChannels() {
    const community = store.get('community', null);
    const list = CAT.channels.map(c => ({ ...c, sources: c.sources.map(s => ({ ...s })), official: (c.official || []).slice() }));
    if (community && community.add) {
      for (const ch of list) {
        const extra = community.add[ch.id];
        if (!extra || ch.id === 'globo') continue;
        const have = new Set(ch.sources.map(srcKey));
        for (const s of extra) {
          if (have.has(srcKey(s))) continue;
          if (s.type === 'hls' && !allowedUrl(s.url)) continue;
          have.add(srcKey(s));
          if (s.front) ch.sources.unshift(s); else ch.sources.push(s);
        }
      }
    }
    const lists = store.get('userLists', []);
    let num = 100;
    for (const L of lists) {
      for (const e of L.entries) {
        list.push({
          id: 'u-' + L.id + '-' + (num), num: num++, name: e.name || 'Sem nome', short: e.name || 'Canal', hue: hashHue(e.name),
          category: 'minhas', tagline: L.name, user: true,
          sources: [{ type: 'hls', url: e.url, label: L.name, origin: 'usuario' }], official: []
        });
      }
    }
    list.sort((a, b) => a.num - b.num);
    channels = list;
    byId = new Map(list.map(c => [c.id, c]));
  }

  /* ---------------- home ---------------- */
  function tile(ch) {
    const st = chStatus(ch);
    const first = ch.sources[0];
    const origin = !first ? 'App oficial' : (ORIGIN[first.origin] || 'Fonte');
    return h('button', {
      class: 'tile', type: 'button', style: '--h:' + (ch.hue ?? 210), 'data-ch': ch.id,
      'aria-label': `${ch.name}, canal ${ch.num}, ${STATUS_LABEL[st]}`,
      onclick: () => openChannel(ch.id)
    },
      h('span', { class: 'num' }, h('span', null, 'CH ' + pad(ch.num)), favs.has(ch.id) ? h('span', { class: 'fav-star', 'aria-label': 'favorito' }, '★') : null),
      h('span', { class: 'name' }, ch.short || ch.name),
      h('span', { class: 'meta' },
        h('span', { class: 'chip ' + st }, h('i'), STATUS_LABEL[st]),
        h('span', { class: 'chip plain' }, ch.sources.length > 1 ? `${origin} · ${ch.sources.length} fontes` : origin)
      ),
      ch.featured && ch.tagline ? h('span', { class: 'tag' }, ch.tagline) : null
    );
  }
  function section(title, sub, items, cls = 'row') {
    return h('section', null,
      h('div', { class: 'section-h' }, h('h2', null, title), sub ? h('span', null, sub) : null),
      h('div', { class: cls }, items.map(tile)));
  }
  function renderHome() {
    const wrap = $('#sections'); wrap.textContent = '';
    const last = byId.get(store.get('last', ''));
    const resume = $('#resume');
    if (last) {
      resume.hidden = false; resume.textContent = '';
      resume.append(h('p', null, 'Você estava assistindo ', h('strong', null, last.name), ` · CH ${pad(last.num)}`),
        h('button', { class: 'btn primary', type: 'button', onclick: () => openChannel(last.id) }, icon('play'), 'Continuar'));
    } else resume.hidden = true;

    const favList = channels.filter(c => favs.has(c.id));
    if (favList.length) wrap.append(section('Favoritos', null, favList));
    wrap.append(section('Globo, SBT e Record', 'as três principais', channels.filter(c => c.featured), 'featured'));
    for (const cat of CAT.categories) {
      const items = channels.filter(c => c.category === cat.id && !c.featured);
      if (items.length) wrap.append(section(cat.id === 'principais' ? 'Mais canais abertos' : cat.name, null, items));
    }
    const mine = channels.filter(c => c.category === 'minhas');
    if (mine.length) wrap.append(section('Minhas listas', `${mine.length} canais importados`, mine));

    const ok = channels.filter(c => chStatus(c) === 'ok').length;
    const tested = channels.filter(c => ['ok', 'down'].includes(chStatus(c))).length;
    const foot = $('#foot'); foot.textContent = '';
    foot.append(
      h('p', null, h('strong', null, `${channels.length} canais`), tested ? ` · ${ok} confirmados no ar neste aparelho` : ' · toque em “Verificar canais” para testar todos daqui'),
      h('p', null, 'O TV Livre só toca transmissões gratuitas que as próprias emissoras, afiliadas ou canais oficiais publicam sem login. Canais pagos e cópias piratas ficam de fora. A Globo libera o sinal apenas no Globoplay, por isso aparece com atalho para o app oficial.'),
      h('p', null, `Versão ${VERSION} · catálogo revisado em ${CAT.curated.split('-').reverse().join('/')}` + (store.get('community', null) ? ` · fontes atualizadas em ${new Date(store.get('community').at).toLocaleDateString('pt-BR')}` : ''))
    );
  }
  function renderSearch(q) {
    const box = $('#search-results');
    const nq = norm(q);
    if (!nq) { box.hidden = true; $('#sections').hidden = false; return; }
    const items = channels.filter(c => norm(c.name).includes(nq) || norm(c.short).includes(nq) || String(c.num) === nq.replace(/^0+/, '') || norm(c.tagline).includes(nq));
    box.textContent = '';
    box.append(items.length ? section('Resultado', `${items.length} canal(is)`, items) : h('p', { class: 'empty' }, `Nenhum canal com “${q}”.`));
    box.hidden = false; $('#sections').hidden = true;
  }
  function refreshUI() {
    if (!$('#search-results').hidden) renderSearch($('#q').value); else renderHome();
    if (P.ch) renderSide();
  }

  /* ---------------- player ---------------- */
  const video = $('#video');
  const P = {
    ch: null, idx: 0, queue: [], qpos: 0, token: 0, engine: null, hls: null, ytp: null, ytReady: false,
    started: false, attempts: [], cleanup: [], vol: store.get('vol', 1), muted: store.get('muted', false),
    lastT: 0, stall: 0, wake: null, tab: 'ch', manual: false
  };

  function showLoading(text) { $('#ov-loading-text').textContent = text; $('#ov-loading').hidden = false; }
  function hideLoading() { $('#ov-loading').hidden = true; }
  function showMsg(...nodes) { const b = $('#ov-msg-box'); b.textContent = ''; b.append(...nodes.filter(Boolean)); $('#ov-msg').hidden = false; }
  function hideMsg() { $('#ov-msg').hidden = true; }
  function setLive(on) { $('#c-live').classList.toggle('off', !on); $('#tally').classList.toggle('on', on); }

  function teardown() {
    P.token++;
    P.cleanup.splice(0).forEach(fn => { try { fn(); } catch { /* ignora */ } });
    if (P.hls) { try { P.hls.destroy(); } catch { /* ignora */ } P.hls = null; }
    if (P.ytp) { try { P.ytp.destroy(); } catch { /* ignora */ } P.ytp = null; }
    P.ytReady = false;
    $('#yt').textContent = ''; $('#yt').hidden = true;
    video.removeAttribute('src'); try { video.load(); } catch { /* ignora */ }
    video.hidden = false;
    P.engine = null; P.started = false; P.stall = 0;
    $('#unmute').hidden = true; $('#c-q').hidden = true; $('#c-pip').hidden = true;
    setLive(false);
  }

  function openChannel(id, opts = {}) {
    const ch = byId.get(id); if (!ch) return;
    const player = $('#player');
    const wasOpen = !player.hidden;
    player.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    if (!wasOpen) history.pushState({ tvl: 'player' }, '', '#ch=' + id);
    else history.replaceState({ tvl: 'player' }, '', '#ch=' + id);
    P.ch = ch; P.manual = opts.src != null;
    store.set('last', id);
    $('#side-name').textContent = ch.name;
    $('#side-sub').textContent = `CH ${pad(ch.num)}${ch.tagline ? ' · ' + ch.tagline : ''}`;
    syncFav();
    showOsd(ch);
    teardown(); hideMsg(); hideLoading();
    if (!ch.sources.length) { renderSide(); showExternal(ch); updateSrcBtn(); mediaMeta(ch); return; }
    const n = ch.sources.length;
    let start = 0;
    if (opts.src != null) start = opts.src;
    else { const pk = prefSrc[ch.id]; const i = ch.sources.findIndex(s => srcKey(s) === pk); if (i >= 0) start = i; }
    P.queue = [start, ...Array.from({ length: n }, (_, i) => i).filter(i => i !== start)];
    P.qpos = 0; P.attempts = [];
    renderSide();
    mediaMeta(ch);
    tryCurrent();
  }

  function tryCurrent() {
    teardown();
    hideMsg();
    const ch = P.ch;
    if (P.qpos >= P.queue.length) return allFailed();
    const i = P.queue[P.qpos]; P.idx = i;
    const src = ch.sources[i];
    const tk = P.token;
    updateSrcBtn();
    renderSide();
    showLoading(`Conectando · fonte ${P.qpos + 1} de ${P.queue.length}\n${src.label}`);
    if (src.type === 'youtube') playYt(src, tk); else playHls(src, tk);
  }

  function fail(tk, note) {
    if (tk !== P.token) return;
    const src = P.ch.sources[P.idx];
    setStatus(srcKey(src), false, note);
    P.attempts.push({ label: src.label, note });
    P.qpos++;
    refreshTiles();
    tryCurrent();
  }
  function success(tk) {
    if (tk !== P.token || P.started) return;
    P.started = true;
    const src = P.ch.sources[P.idx];
    setStatus(srcKey(src), true, 'tocando');
    prefSrc[P.ch.id] = srcKey(src); store.set('pref', prefSrc);
    hideLoading(); hideMsg(); setLive(true);
    if (P.attempts.length) toast(`Fonte trocada automaticamente: ${src.label}`);
    renderSide(); refreshTiles(); requestWake();
  }
  function allFailed() {
    teardown(); hideLoading();
    const ch = P.ch;
    showMsg(
      h('h3', null, `${ch.name}: nenhuma fonte respondeu agora`),
      h('p', null, navigator.onLine === false ? 'O aparelho está sem internet.' : 'Pode ser instabilidade da emissora, bloqueio regional ou manutenção. Tente de novo em alguns minutos ou use o canal oficial.'),
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => openChannel(ch.id) }, icon('refresh'), 'Tentar de novo'),
        officialButtons(ch)),
      ch.notice ? h('p', { class: 'long' }, ch.notice) : null,
      h('details', null, h('summary', null, `O que foi tentado (${P.attempts.length} fontes)`),
        h('ul', null, P.attempts.map(a => h('li', null, '• ', h('strong', null, a.label), ` — ${a.note}`))))
    );
    refreshTiles();
  }
  function officialButtons(ch) {
    const out = (ch.official || []).map(o => o.url.startsWith('#ch=')
      ? h('button', { class: 'btn', type: 'button', onclick: () => openChannel(o.url.slice(4)) }, icon('play'), o.label)
      : h('a', { class: 'btn', href: o.url, target: '_blank', rel: 'noopener', title: o.hint || '' }, icon('ext'), o.label));
    if (ch.related && byId.get(ch.related)) out.push(h('button', { class: 'btn', type: 'button', onclick: () => openChannel(ch.related) }, icon('play'), `Assistir ${byId.get(ch.related).name} aqui`));
    return out;
  }
  function showExternal(ch) {
    hideLoading();
    showMsg(
      h('h3', null, `${ch.name} só abre no app oficial`),
      h('p', null, ch.notice || 'Esta emissora não libera o sinal para outros aplicativos.'),
      h('div', { class: 'actions' }, officialButtons(ch).map((b, i) => { if (i === 0) b.classList.add('primary'); return b; }))
    );
  }

  /* ---- motor HLS ---- */
  function canNative() { return !!video.canPlayType('application/vnd.apple.mpegurl'); }
  function netNote(d) {
    const code = d.response && d.response.code;
    if (/timeout/i.test(d.details)) return 'tempo esgotado';
    if (code === 403) return 'acesso negado (403), pode ser bloqueio regional';
    if (code === 451) return 'bloqueado nesta região';
    if (code === 404 || code === 410) return 'fora do ar (404)';
    if (code >= 500) return `servidor com erro (${code})`;
    if (!code) return 'sem resposta (offline ou acesso bloqueado)';
    return `erro de rede (${code})`;
  }
  function playHls(src, tk) {
    P.engine = 'hls';
    if (location.protocol === 'https:' && src.url.startsWith('http:')) return fail(tk, 'endereço http:// bloqueado pelo navegador');
    const startTimer = setTimeout(() => fail(tk, 'tempo esgotado (20 s)'), START_TIMEOUT);
    const onPlaying = () => { clearTimeout(startTimer); success(tk); };
    const onWaiting = () => { if (P.started && tk === P.token) showLoading('Carregando…'); };
    const onPlayingHide = () => { if (tk === P.token) hideLoading(); };
    video.addEventListener('playing', onPlaying);
    video.addEventListener('playing', onPlayingHide);
    video.addEventListener('waiting', onWaiting);
    P.cleanup.push(() => { clearTimeout(startTimer); video.removeEventListener('playing', onPlaying); video.removeEventListener('playing', onPlayingHide); video.removeEventListener('waiting', onWaiting); });
    const watch = setInterval(() => watchdog(tk), 3000);
    P.cleanup.push(() => clearInterval(watch));
    if ('pictureInPictureEnabled' in document && document.pictureInPictureEnabled) $('#c-pip').hidden = false;

    const useHlsJs = window.Hls && Hls.isSupported();
    if (!useHlsJs) { if (canNative()) return playNative(src, tk, ''); return fail(tk, 'navegador sem suporte a HLS'); }
    const hls = new Hls({
      enableWorker: true, lowLatencyMode: false, backBufferLength: 30, maxBufferLength: 30,
      liveSyncDurationCount: 3, capLevelToPlayerSize: true, startLevel: -1,
      manifestLoadingTimeOut: 10000, manifestLoadingMaxRetry: 1, levelLoadingTimeOut: 10000, fragLoadingTimeOut: 20000
    });
    P.hls = hls;
    let mediaRecover = 0, netRetry = 0;
    hls.on(Hls.Events.MANIFEST_PARSED, (_e, d) => { if (tk !== P.token) return; buildQuality(d.levels); playVideo(tk); });
    hls.on(Hls.Events.ERROR, (_e, d) => {
      if (tk !== P.token || !d.fatal) return;
      if (d.type === Hls.ErrorTypes.NETWORK_ERROR) {
        if (!P.started && /manifest/i.test(d.details) && canNative() && !(d.response && d.response.code)) {
          hls.destroy(); P.hls = null; return playNative(src, tk, 'cors');
        }
        if (P.started && netRetry++ < 3) { hls.startLoad(); return; }
        return fail(tk, netNote(d));
      }
      if (d.type === Hls.ErrorTypes.MEDIA_ERROR) {
        mediaRecover++;
        if (mediaRecover === 1) return hls.recoverMediaError();
        if (mediaRecover === 2) { hls.swapAudioCodec(); return hls.recoverMediaError(); }
        return fail(tk, 'formato de vídeo não suportado');
      }
      fail(tk, 'erro do player (' + d.details + ')');
    });
    hls.loadSource(src.url);
    hls.attachMedia(video);
  }
  function playNative(src, tk, why) {
    const onErr = () => fail(tk, why === 'cors' ? 'acesso bloqueado (CORS) e sem reprodução nativa' : 'erro de reprodução');
    video.addEventListener('error', onErr, { once: true });
    P.cleanup.push(() => video.removeEventListener('error', onErr));
    video.src = src.url;
    playVideo(tk);
  }
  function playVideo(tk) {
    video.volume = P.vol; video.muted = P.muted;
    const p = video.play();
    if (p && p.catch) p.catch(err => {
      if (tk !== P.token) return;
      if (err && err.name === 'NotAllowedError') {
        video.muted = true;
        video.play().then(() => { $('#unmute').hidden = false; }).catch(() => {
          hideLoading();
          showMsg(h('h3', null, 'Toque para assistir'), h('div', { class: 'actions' }, h('button', { class: 'btn primary', type: 'button', onclick: () => { hideMsg(); video.muted = P.muted; video.play().catch(() => {}); } }, icon('play'), 'Assistir')));
        });
      }
    });
    syncCtl();
  }
  function watchdog(tk) {
    if (tk !== P.token || !P.started || video.paused || video.seeking) { P.stall = 0; return; }
    if (Math.abs(video.currentTime - P.lastT) < 0.01) P.stall += 3; else P.stall = 0;
    P.lastT = video.currentTime;
    if (P.stall === 12 && P.hls) { P.hls.startLoad(); if (P.hls.liveSyncPosition) video.currentTime = P.hls.liveSyncPosition; }
    if (P.stall >= 24) { P.started = false; fail(tk, 'transmissão travou'); }
  }
  function buildQuality(levels) {
    $('#c-q').hidden = !(levels && levels.length > 1);
  }
  function chooseQuality() {
    if (!P.hls) return;
    const lv = P.hls.levels.map((l, i) => ({ i, label: l.height ? l.height + 'p' : Math.round(l.bitrate / 1000) + ' kbps' }));
    const cur = P.hls.autoLevelEnabled ? -1 : P.hls.currentLevel;
    openSheet('Qualidade do vídeo', [
      h('div', { class: 'diag' }, [{ i: -1, label: 'Automática (recomendado)' }, ...lv.reverse()].map(o =>
        h('button', { class: 'li' + (o.i === cur ? ' cur' : ''), type: 'button', onclick: () => { P.hls.currentLevel = o.i; closeSheet(); toast('Qualidade: ' + o.label); } },
          h('span', { class: 'n' }, o.i === -1 ? 'A' : ''), h('span', { class: 'nm' }, o.label), h('span'))))
    ]);
  }

  /* ---- motor YouTube ---- */
  let ytApi = null;
  function loadYtApi() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (ytApi) return ytApi;
    ytApi = new Promise((res, rej) => {
      const t = setTimeout(() => { ytApi = null; rej(new Error('timeout')); }, 10000);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { clearTimeout(t); if (prev) prev(); res(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = () => { clearTimeout(t); ytApi = null; s.remove(); rej(new Error('net')); };
      document.head.append(s);
    });
    return ytApi;
  }
  function ytErr(c) {
    if (c === 101 || c === 150) return 'a emissora não permite exibir este vídeo fora do YouTube';
    if (c === 100) return 'transmissão removida ou privada';
    if (c === 153) return 'o YouTube recusou a página (abra pelo endereço https)';
    if (c === 2) return 'endereço do vídeo inválido';
    return 'erro no player do YouTube (' + c + ')';
  }
  function playYt(src, tk) {
    P.engine = 'yt';
    video.hidden = true;
    const box = $('#yt'); box.hidden = false; box.textContent = '';
    box.append(h('div', { id: 'yt-host' }));
    const startTimer = setTimeout(() => {
      if (tk !== P.token) return;
      if (P.ytReady) { hideLoading(); toast('Toque no vídeo para começar'); }
      else fail(tk, 'YouTube não carregou nesta rede');
    }, 15000);
    P.cleanup.push(() => clearTimeout(startTimer));
    loadYtApi().then(YT => {
      if (tk !== P.token) return;
      const vars = { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, fs: 0 };
      if (location.origin && location.origin !== 'null') vars.origin = location.origin;
      P.ytp = new YT.Player('yt-host', {
        videoId: src.video, width: '100%', height: '100%', playerVars: vars,
        events: {
          onReady: e => { P.ytReady = true; try { e.target.setVolume(Math.round(P.vol * 100)); if (P.muted) e.target.mute(); else e.target.unMute(); e.target.playVideo(); } catch { /* ignora */ } },
          onStateChange: e => {
            if (tk !== P.token) return;
            if (e.data === YT.PlayerState.PLAYING) { clearTimeout(startTimer); success(tk); syncCtl(); }
            else if (e.data === YT.PlayerState.PAUSED) syncCtl();
            else if (e.data === YT.PlayerState.ENDED) { P.started = false; fail(tk, 'transmissão encerrada'); }
          },
          onError: e => { clearTimeout(startTimer); P.started = false; fail(tk, ytErr(e.data)); }
        }
      });
      const ifr = box.querySelector('iframe');
      if (ifr) ifr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    }).catch(() => { clearTimeout(startTimer); fail(tk, 'YouTube indisponível nesta rede'); });
  }

  /* ---- controles ---- */
  function isPaused() {
    if (P.engine === 'yt' && P.ytp && P.ytp.getPlayerState) return P.ytp.getPlayerState() !== 1;
    return video.paused;
  }
  function togglePlay() {
    if (P.engine === 'yt' && P.ytp) { isPaused() ? P.ytp.playVideo() : P.ytp.pauseVideo(); setTimeout(syncCtl, 200); return; }
    if (!P.engine) return;
    if (video.paused) {
      if (P.hls && P.hls.liveSyncPosition && video.currentTime < P.hls.liveSyncPosition - 30) video.currentTime = P.hls.liveSyncPosition;
      video.play().catch(() => {});
    } else video.pause();
    syncCtl();
  }
  function setMuted(m) {
    P.muted = m; store.set('muted', m);
    video.muted = m;
    if (P.ytp && P.ytp.mute) { m ? P.ytp.mute() : P.ytp.unMute(); }
    if (!m) $('#unmute').hidden = true;
    syncCtl();
  }
  function setVolume(v) {
    P.vol = Math.max(0, Math.min(1, v)); store.set('vol', P.vol);
    video.volume = P.vol;
    if (P.ytp && P.ytp.setVolume) P.ytp.setVolume(Math.round(P.vol * 100));
    if (P.vol > 0 && P.muted) setMuted(false);
    $('#c-vol').value = P.vol; syncCtl();
  }
  function syncCtl() {
    const paused = isPaused();
    const play = $('#c-play'); play.textContent = ''; play.append(icon(paused ? 'play' : 'pause')); play.setAttribute('aria-label', paused ? 'Reproduzir' : 'Pausar');
    const mute = $('#c-mute'); mute.textContent = ''; mute.append(icon(P.muted || P.vol === 0 ? 'mute' : 'vol')); mute.setAttribute('aria-label', P.muted ? 'Ativar som' : 'Silenciar');
    $('#c-vol').value = P.vol;
  }
  function updateSrcBtn() {
    const ch = P.ch; const t = $('#c-src-t');
    if (!ch || !ch.sources.length) { t.textContent = 'App oficial'; return; }
    t.textContent = `Fonte ${P.idx + 1}/${ch.sources.length}`;
    $('#c-src').title = ch.sources[P.idx] ? ch.sources[P.idx].label : '';
  }
  function zap(dir) {
    if (!P.ch) return;
    const order = channels;
    const i = order.findIndex(c => c.id === P.ch.id);
    const next = order[(i + dir + order.length) % order.length];
    openChannel(next.id);
  }
  function toggleFav() {
    const id = P.ch && P.ch.id; if (!id) return;
    if (favs.has(id)) { favs.delete(id); toast('Removido dos favoritos'); } else { favs.add(id); toast('Adicionado aos favoritos'); }
    store.set('favs', [...favs]);
    syncFav();
    refreshTiles();
  }
  function syncFav() {
    const on = !!(P.ch && favs.has(P.ch.id));
    for (const b of [$('#c-fav'), $('#c-fav2')]) { b.classList.toggle('on', on); b.setAttribute('aria-label', on ? 'Remover dos favoritos' : 'Favoritar'); }
  }
  async function toggleFs() {
    const pl = $('#player');
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) { await (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen()); return; }
      if (pl.requestFullscreen) { await pl.requestFullscreen({ navigationUI: 'hide' }); try { await screen.orientation.lock('landscape'); } catch { /* opcional */ } return; }
      if (pl.webkitRequestFullscreen) { pl.webkitRequestFullscreen(); return; }
      if (P.engine === 'hls' && video.webkitEnterFullscreen) { video.webkitEnterFullscreen(); return; }
    } catch { /* cai no modo tela cheia interno */ }
    pl.classList.toggle('fs');
  }
  async function togglePip() {
    try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await video.requestPictureInPicture(); } catch { toast('Janela flutuante indisponível aqui'); }
  }
  function closePlayer(fromPop) {
    teardown(); hideMsg(); hideLoading();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
    $('#player').hidden = true; $('#player').classList.remove('fs');
    document.documentElement.style.overflow = '';
    P.ch = null; releaseWake();
    if (!fromPop && history.state && history.state.tvl === 'player') history.back();
    refreshUI();
    const t = document.querySelector(`.tile[data-ch="${store.get('last', '')}"]`); if (t) t.focus({ preventScroll: true });
  }

  /* ---- lista lateral ---- */
  function renderSide() {
    const list = $('#side-list'); list.textContent = '';
    $('#tab-ch').setAttribute('aria-selected', P.tab === 'ch'); $('#tab-src').setAttribute('aria-selected', P.tab === 'src');
    if (P.tab === 'ch') {
      for (const c of channels) {
        const st = chStatus(c);
        const b = h('button', { class: 'li' + (P.ch && c.id === P.ch.id ? ' cur' : ''), type: 'button', onclick: () => openChannel(c.id) },
          h('span', { class: 'n' }, pad(c.num)),
          h('span', { class: 'nm' }, c.name, h('span', { class: 'sub' }, STATUS_LABEL[st] + (c.tagline ? ' · ' + c.tagline : ''))),
          h('span', { class: 'dot ' + st }));
        list.append(b);
      }
      const cur = list.querySelector('.cur'); if (cur && window.innerWidth >= 1000) cur.scrollIntoView({ block: 'nearest' });
    } else {
      const ch = P.ch; if (!ch) return;
      if (!ch.sources.length) list.append(h('p', { class: 'src-note' }, 'Este canal não tem transmissão liberada para outros apps.'));
      ch.sources.forEach((s, i) => {
        const k = srcKey(s); const st = status[k];
        const cls = testing.has(k) ? 'test' : st && fresh(k) ? (st.ok ? 'ok' : 'down') : '';
        const sub = (ORIGIN[s.origin] || 'Fonte') + (s.type === 'youtube' ? ' · YouTube' : ' · HLS') + (st && fresh(k) ? ' · ' + st.note : '');
        list.append(h('button', { class: 'li' + (i === P.idx && P.engine ? ' cur' : ''), type: 'button', onclick: () => openChannel(ch.id, { src: i }) },
          h('span', { class: 'n' }, String(i + 1)), h('span', { class: 'nm' }, s.label, h('span', { class: 'sub' }, sub)), h('span', { class: 'dot ' + cls })));
      });
      if ((ch.official || []).length) {
        list.append(h('p', { class: 'src-note' }, 'Canais oficiais da emissora:'));
        list.append(h('div', { class: 'hstack', style: 'padding:0 12px 12px' }, officialButtons(ch)));
      }
      list.append(h('p', { class: 'src-note' }, 'Se uma fonte falhar, o app pula sozinho para a próxima e lembra qual funcionou por último.'));
    }
  }
  function refreshTiles() {
    if (P.ch) renderSide();
    if (!$('#player').hidden) return; // a home é redesenhada ao fechar o player
    refreshUI();
  }

  /* ---- OSD, números, gestos ---- */
  let osdTimer;
  function showOsd(ch) {
    $('#osd-n').textContent = pad(ch.num);
    $('#osd-t').firstChild.textContent = ch.name;
    $('#osd-s').textContent = ch.sources.length ? (ch.tagline || '') : 'Só no app oficial';
    const o = $('#osd'); o.classList.remove('hide');
    clearTimeout(osdTimer); osdTimer = setTimeout(() => o.classList.add('hide'), 4000);
  }
  let digitBuf = '', digitTimer;
  function typeDigit(d) {
    digitBuf = (digitBuf + d).slice(-3);
    const box = $('#digits'); box.textContent = digitBuf.padEnd(2, '-'); box.hidden = false;
    clearTimeout(digitTimer);
    digitTimer = setTimeout(() => {
      box.hidden = true; const n = parseInt(digitBuf, 10); digitBuf = '';
      const c = channels.find(x => x.num === n);
      if (c) openChannel(c.id); else toast(`Não existe o canal ${n}`);
    }, 1300);
  }
  let idleTimer;
  function poke() { const p = $('#player'); p.classList.remove('idle'); clearTimeout(idleTimer); idleTimer = setTimeout(() => p.classList.add('idle'), 3500); }

  function mediaMeta(ch) {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: ch.name, artist: `TV Livre · CH ${pad(ch.num)}`, artwork: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }] });
      navigator.mediaSession.setActionHandler('nexttrack', () => zap(1));
      navigator.mediaSession.setActionHandler('previoustrack', () => zap(-1));
      navigator.mediaSession.setActionHandler('play', () => { if (isPaused()) togglePlay(); });
      navigator.mediaSession.setActionHandler('pause', () => { if (!isPaused()) togglePlay(); });
    } catch { /* opcional */ }
  }
  async function requestWake() { try { if ('wakeLock' in navigator && !P.wake) { P.wake = await navigator.wakeLock.request('screen'); P.wake.addEventListener('release', () => { P.wake = null; }); } } catch { /* opcional */ } }
  function releaseWake() { try { if (P.wake) P.wake.release(); } catch { /* opcional */ } P.wake = null; }

  /* ---------------- diagnóstico (testa a partir deste aparelho) ---------------- */
  async function fetchText(url, ms) {
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
    try {
      const r = await fetch(url, { signal: ac.signal, cache: 'no-store', mode: 'cors', credentials: 'omit' });
      const text = r.ok ? await r.text() : '';
      return { ok: r.ok, status: r.status, text, url: r.url || url };
    } finally { clearTimeout(t); }
  }
  function httpNote(c) { return c === 404 || c === 410 ? 'fora do ar (404)' : c === 403 ? 'acesso negado (403), pode ser bloqueio regional' : c === 451 ? 'bloqueado nesta região' : `erro ${c}`; }
  function firstVariant(text, base) {
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
      for (let j = i + 1; j < lines.length; j++) { const l = lines[j].trim(); if (l && !l.startsWith('#')) { try { return new URL(l, base).href; } catch { return null; } } }
    }
    return null;
  }
  function probeNative(url) {
    return new Promise(res => {
      const v = document.createElement('video'); v.muted = true; v.preload = 'metadata';
      const done = ok => { clearTimeout(t); v.removeAttribute('src'); try { v.load(); } catch { /* ignora */ } res(ok); };
      const t = setTimeout(() => done(false), 10000);
      v.addEventListener('loadedmetadata', () => done(true), { once: true });
      v.addEventListener('error', () => done(false), { once: true });
      v.src = url;
    });
  }
  async function probe(s) {
    if (s.type === 'youtube') {
      try {
        const u = 'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + s.video);
        const r = await fetchText(u, 8000);
        if (r.ok) return { ok: null, note: 'vídeo publicado; confirmação ao assistir' };
        if (r.status === 401 || r.status === 403) return { ok: false, note: 'a emissora bloqueou a exibição fora do YouTube' };
        if (r.status === 404 || r.status === 400) return { ok: false, note: 'transmissão removida ou privada' };
        return { ok: null, note: 'não verificável daqui; teste ao assistir' };
      } catch { return { ok: null, note: 'não verificável daqui; teste ao assistir' }; }
    }
    if (location.protocol === 'https:' && s.url.startsWith('http:')) return { ok: false, note: 'endereço http:// bloqueado pelo navegador' };
    try {
      const r = await fetchText(s.url, 9000);
      if (!r.ok) return { ok: false, note: httpNote(r.status) };
      if (!/#EXTM3U/.test(r.text)) return { ok: false, note: 'a resposta não é uma transmissão' };
      if (/#EXT-X-STREAM-INF/.test(r.text)) {
        const sub = firstVariant(r.text, r.url);
        if (sub) {
          const r2 = await fetchText(sub, 9000);
          if (!r2.ok) return { ok: false, note: httpNote(r2.status) };
          if (!/#EXTINF/.test(r2.text)) return { ok: false, note: 'sem vídeo no momento' };
        }
      } else if (!/#EXTINF/.test(r.text)) return { ok: false, note: 'sem vídeo no momento' };
      return { ok: true, note: 'respondendo' };
    } catch (e) {
      if (e && e.name === 'AbortError') return { ok: false, note: 'tempo esgotado' };
      if (canNative()) { const ok = await probeNative(s.url); return ok ? { ok: true, note: 'respondendo (modo nativo)' } : { ok: false, note: 'sem resposta' }; }
      return { ok: false, note: 'sem resposta ou acesso bloqueado' };
    }
  }

  let diagRunning = false;
  async function runDiagnostic() {
    if (diagRunning) return;
    const prog = h('div', { class: 'progress' }, h('i'));
    const summary = h('p', null, 'Preparando…');
    const listBox = h('div', { class: 'diag' });
    const again = h('button', { class: 'btn', type: 'button', disabled: true, onclick: () => { closeSheet(); runDiagnostic(); } }, icon('refresh'), 'Testar de novo');
    openSheet('Verificar canais', [
      h('p', null, 'Cada fonte é testada a partir deste aparelho e desta internet, que é o que vale para você. O teste baixa só a lista de cada transmissão, não o vídeo, então gasta poucos dados.'),
      prog, summary, listBox, h('div', { class: 'hstack' }, again)
    ]);
    if (navigator.onLine === false) { summary.textContent = 'O aparelho está sem internet.'; again.disabled = false; return; }
    diagRunning = true;
    const rows = new Map();
    const testableCh = channels.filter(c => c.sources.length);
    for (const c of testableCh) {
      const ul = h('ul');
      const dot = h('span', { class: 'chip test' }, h('i'), 'Testando…');
      const det = h('details', null, h('summary', null, h('span', { class: 'n' }, pad(c.num)), h('strong', null, c.name), dot), ul);
      listBox.append(det); rows.set(c.id, { ul, dot, det, items: new Map() });
      for (const s of c.sources) {
        const d = h('span', { class: 'dot test' }); const t = h('span', null, s.label, ' ', h('em', null, '· testando'));
        const li = h('li', null, d, t); ul.append(li); rows.get(c.id).items.set(srcKey(s), { d, t, s });
      }
    }
    const tasks = testableCh.flatMap(c => c.sources.map(s => ({ c, s })));
    tasks.forEach(({ s }) => testing.add(srcKey(s)));
    let done = 0; const total = tasks.length;
    const finishCh = c => {
      const row = rows.get(c.id); const st = chStatus(c);
      if (c.sources.every(s => !testing.has(srcKey(s)))) {
        row.dot.className = 'chip ' + (st === 'ok' ? 'ok' : st === 'down' ? 'down' : '');
        row.dot.textContent = ''; row.dot.append(h('i'), st === 'ok' ? 'No ar' : st === 'down' ? 'Fora do ar' : 'Confirmar ao assistir');
        if (st !== 'ok') row.det.open = true;
      }
    };
    const worker = async () => {
      while (tasks.length) {
        const { c, s } = tasks.shift(); const k = srcKey(s);
        const r = await probe(s);
        testing.delete(k);
        if (typeof r.ok === 'boolean') setStatus(k, r.ok, r.note);
        const it = rows.get(c.id).items.get(k);
        it.d.className = 'dot ' + (r.ok === true ? 'ok' : r.ok === false ? 'down' : '');
        it.t.textContent = ''; it.t.append(s.label, ' ', h('em', null, '· ' + r.note));
        done++; prog.firstChild.style.width = Math.round(done / total * 100) + '%';
        summary.textContent = `Testando ${done} de ${total} fontes…`;
        finishCh(c);
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    diagRunning = false;
    const okCh = testableCh.filter(c => chStatus(c) === 'ok');
    const key = ['globo', 'sbt', 'record'].map(id => byId.get(id)).filter(Boolean)
      .map(c => `${c.name}: ${c.sources.length ? (chStatus(c) === 'ok' ? 'no ar' : chStatus(c) === 'down' ? 'fora do ar' : 'confirmar ao assistir') : 'só no Globoplay'}`).join(' · ');
    prog.firstChild.style.width = '100%';
    summary.textContent = `${okCh.length} de ${testableCh.length} canais com pelo menos uma fonte no ar.` + (key ? ` ${key}.` : '');
    again.disabled = false;
    store.set('diagAt', Date.now());
    refreshTiles(); if (!$('#player').hidden) renderSide();
  }

  /* ---------------- atualização automática de fontes ---------------- */
  function parseM3U(text) {
    const out = []; const lines = String(text).split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.startsWith('#EXTINF')) continue;
      const attr = k => { const m = l.match(new RegExp(k + '="([^"]*)"')); return m ? m[1] : ''; };
      const name = (l.split(/,(.*)$/s)[1] || '').trim();
      let url = '';
      for (let j = i + 1; j < lines.length; j++) { const x = lines[j].trim(); if (!x) continue; if (x.startsWith('#')) continue; url = x; i = j; break; }
      if (url) out.push({ tvgId: attr('tvg-id').split('@')[0], name, group: attr('group-title'), url });
    }
    return out;
  }
  const FREETV_MAP = { 'sbt': 'sbt', 'record': 'record', 'record news': 'record-news', 'tv cultura': 'cultura', 'tv camara': 'tv-camara', 'com brasil': 'com-brasil', 'rede brasil': 'rede-brasil', 'tv brasil': 'tv-brasil', 'band': 'band', 'redetv!': 'redetv', 'rede tv!': 'redetv', 'sbt news': 'sbt-news', 'cnn brasil': 'cnn-brasil', 'canal gov': 'canal-gov' };
  function parseFreeTv(md) {
    const out = [];
    for (const line of String(md).split(/\r?\n/)) {
      const m = line.match(/^\|\s*\d+\s*\|\s*([^|]+?)\s*\|\s*\[(>|x)\]\((https?:\/\/[^)\s]+)\)/);
      if (!m || m[2] !== '>') continue;
      const name = m[1].replace(/[ⒼⓎ]/g, '').trim();
      out.push({ name, url: m[3] });
    }
    return out;
  }
  function ytId(u) { const m = u.match(/[?&]v=([\w-]{11})/) || u.match(/youtu\.be\/([\w-]{11})/) || u.match(/\/live\/([\w-]{11})/); return m ? m[1] : null; }
  async function updateSources(manual) {
    if (navigator.onLine === false) { if (manual) toast('Sem internet para atualizar as fontes'); return; }
    if (manual) toast('Atualizando fontes…', 8000);
    const [a, b] = await Promise.allSettled([fetchText(UPDATE_URLS.iptvorg, 15000), fetchText(UPDATE_URLS.freetv, 15000)]);
    const add = {}; let found = 0;
    const push = (id, s) => { (add[id] = add[id] || []); if (!add[id].some(x => srcKey(x) === srcKey(s))) { add[id].push(s); found++; } };
    if (a.status === 'fulfilled' && a.value.ok) {
      const entries = parseM3U(a.value.text);
      for (const ch of CAT.channels) {
        if (ch.id === 'globo' || !ch.match || !ch.match.length) continue;
        const ids = new Set(ch.match);
        for (const e of entries) if (ids.has(e.tvgId) && allowedUrl(e.url)) push(ch.id, { type: 'hls', url: e.url, label: e.name.replace(/\s*\[[^\]]*\]|\s*\(\d+[pi]\)/g, '').trim() + ' · lista iptv-org', origin: 'comunidade' });
      }
    }
    if (b.status === 'fulfilled' && b.value.ok) {
      for (const e of parseFreeTv(b.value.text)) {
        const id = FREETV_MAP[norm(e.name)]; if (!id || id === 'globo') continue;
        const vid = /youtube\.com|youtu\.be/.test(e.url) ? ytId(e.url) : null;
        if (vid) push(id, { type: 'youtube', video: vid, label: 'YouTube oficial · atualizado', origin: 'oficial', front: true });
        else if (allowedUrl(e.url)) push(id, { type: 'hls', url: e.url, label: `${e.name} · lista Free-TV`, origin: 'comunidade' });
      }
    }
    const okAny = (a.status === 'fulfilled' && a.value.ok) || (b.status === 'fulfilled' && b.value.ok);
    if (!okAny) { if (manual) toast('Não foi possível baixar as listas agora'); return; }
    const before = new Set(channels.flatMap(c => c.sources.map(srcKey)));
    store.set('community', { at: Date.now(), add });
    buildChannels();
    const fresh = channels.flatMap(c => c.sources.map(srcKey)).filter(k => !before.has(k)).length;
    refreshUI();
    if (manual) toast(fresh ? `${fresh} fonte(s) nova(s) adicionada(s)` : 'Fontes conferidas: nada novo');
    return { found, fresh };
  }

  /* ---------------- folhas: importar e sobre ---------------- */
  function openSheet(title, nodes) {
    $('#sheet-title').textContent = title;
    const b = $('#sheet-body'); b.textContent = ''; b.append(...[].concat(nodes));
    $('#sheet').hidden = false;
    $('#sheet-close').focus();
  }
  function closeSheet() { $('#sheet').hidden = true; }

  function importSheet() {
    const lists = store.get('userLists', []);
    const msg = h('p', { role: 'status' });
    const addList = (name, text) => {
      const entries = parseM3U(text).slice(0, 1000).map(e => ({ name: e.name.replace(/\s*\[[^\]]*\]/g, ''), url: e.url }));
      if (!entries.length) { msg.textContent = 'Nenhum canal encontrado. Confira se é uma lista M3U.'; return; }
      const L = store.get('userLists', []);
      L.push({ id: Date.now().toString(36), name: name.slice(0, 40), entries });
      store.set('userLists', L); buildChannels(); refreshUI();
      const httpCount = entries.filter(e => e.url.startsWith('http:')).length;
      msg.textContent = `${entries.length} canais importados em “${name}”.` + (httpCount && location.protocol === 'https:' ? ` ${httpCount} usam http:// e serão bloqueados pelo navegador.` : '');
      setTimeout(importSheet, 900);
    };
    const file = h('input', { type: 'file', id: 'imp-file', accept: '.m3u,.m3u8,.txt,audio/x-mpegurl,application/vnd.apple.mpegurl' });
    file.addEventListener('change', () => { const f = file.files[0]; if (!f) return; f.text().then(t => addList(f.name.replace(/\.(m3u8?|txt)$/i, ''), t)); });
    const url = h('input', { type: 'url', id: 'imp-url', placeholder: 'https://…/lista.m3u', inputmode: 'url' });
    const paste = h('textarea', { id: 'imp-text', placeholder: '#EXTM3U\n#EXTINF:-1,Nome do canal\nhttps://…/index.m3u8' });
    openSheet('Importar lista M3U', [
      h('p', null, 'Adicione uma lista sua (arquivo, endereço ou texto colado). Ela fica só neste aparelho, numa seção “Minhas listas”. Use apenas listas de transmissões autorizadas.'),
      h('div', { class: 'field' }, h('label', { for: 'imp-file' }, 'Arquivo .m3u'), file),
      h('div', { class: 'field' }, h('label', { for: 'imp-url' }, 'Endereço da lista'), h('div', { class: 'hstack' }, url,
        h('button', { class: 'btn', type: 'button', onclick: async () => {
          if (!url.value) return; msg.textContent = 'Baixando…';
          try { const r = await fetchText(url.value, 15000); if (!r.ok) throw new Error(); addList(new URL(url.value).hostname, r.text); }
          catch { msg.textContent = 'Não consegui baixar essa lista daqui (o servidor pode bloquear acesso de outros sites). Baixe o arquivo e use a opção acima.'; }
        } }, 'Carregar'))),
      h('div', { class: 'field' }, h('label', { for: 'imp-text' }, 'Ou cole o conteúdo'), paste,
        h('div', null, h('button', { class: 'btn', type: 'button', onclick: () => paste.value.trim() && addList('Lista colada', paste.value) }, 'Adicionar'))),
      msg,
      lists.length ? h('div', { class: 'diag' }, lists.map(L => h('div', { class: 'hstack', style: 'justify-content:space-between;border:1px solid var(--line);border-radius:8px;padding:8px 10px' },
        h('span', null, h('strong', null, L.name), ` · ${L.entries.length} canais`),
        h('button', { class: 'btn danger', type: 'button', onclick: () => { store.set('userLists', store.get('userLists', []).filter(x => x.id !== L.id)); buildChannels(); refreshUI(); importSheet(); } }, 'Remover')))) : null
    ]);
  }

  function aboutSheet() {
    const k = (key, txt) => h('li', null, h('span', { class: 'kbd' }, key), ' ', txt);
    openSheet('Como funciona', [
      h('p', null, h('strong', null, 'Como o app escolhe a transmissão. '), 'Cada canal tem várias fontes: a oficial da emissora, afiliadas que publicam o próprio sinal e canais gratuitos oficiais. Se uma não responde, o player pula para a próxima em segundos e lembra qual funcionou.'),
      h('p', null, h('strong', null, 'Globo. '), 'O sinal ao vivo gratuito existe só no Globoplay (conta Globo grátis e localização ligada) e é protegido contra cópia. Por isso o botão da Globo abre o Globoplay. No app você assiste ao ge TV, canal gratuito oficial do Grupo Globo.'),
      h('p', null, h('strong', null, 'SBT. '), 'Toca pelo YouTube oficial do SBT dentro do app, com afiliadas como reserva.'),
      h('p', null, h('strong', null, 'Record. '), 'Toca por fonte pública de afiliada, que pode cair. O Record News, oficial e 24h, toca direto no app. O sinal completo oficial fica no site R7 e no RecordPlus.'),
      h('p', null, h('strong', null, 'Atualização. '), 'Uma vez por semana o app confere as listas públicas iptv-org e Free-TV e adiciona endereços novos desses mesmos canais, sempre com a mesma regra: só HTTPS, sem canal pago e sem captura de satélite.'),
      h('p', null, h('strong', null, 'Atalhos no computador. ')),
      h('ul', { style: 'margin:0;padding-left:18px;display:grid;gap:6px;color:#c3cad6;font-size:14px' },
        k('↑ ↓', 'troca de canal'), k('0–9', 'digita o número do canal, como no controle remoto'), k('← →', 'volume'),
        k('Espaço', 'pausa'), k('M', 'mudo'), k('F', 'tela cheia'), k('S', 'próxima fonte'), k('Esc', 'volta ao catálogo')),
      h('p', null, h('strong', null, 'No celular. '), 'Deslize para cima ou para baixo sobre o vídeo para trocar de canal. Toque duas vezes para tela cheia.'),
      h('p', null, h('strong', null, 'Instalar. '), 'No Android, abra pelo Chrome, menu ⋮ e “Instalar app” (ou “Adicionar à tela inicial”). No computador, o ícone de instalar aparece na barra de endereço do Chrome ou do Edge.'),
      h('p', { style: 'color:var(--muted);font-size:12.5px' }, `TV Livre ${VERSION} · player hls.js (Apache 2.0) · fontes Archivo e JetBrains Mono (OFL).`)
    ]);
  }

  /* ---------------- eventos ---------------- */
  function bind() {
    $('#q').addEventListener('input', e => renderSearch(e.target.value));
    $('#home-link').addEventListener('click', e => { e.preventDefault(); $('#q').value = ''; renderSearch(''); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    $('#btn-diag').addEventListener('click', runDiagnostic);
    const menu = $('#menu'), mb = $('#btn-menu');
    mb.addEventListener('click', e => { e.stopPropagation(); menu.hidden = !menu.hidden; mb.setAttribute('aria-expanded', !menu.hidden); });
    document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) { menu.hidden = true; mb.setAttribute('aria-expanded', 'false'); } });
    menu.addEventListener('click', e => {
      const b = e.target.closest('button[data-act]'); if (!b) return; menu.hidden = true;
      const a = b.dataset.act;
      if (a === 'update') updateSources(true);
      if (a === 'import') importSheet();
      if (a === 'about') aboutSheet();
      if (a === 'install' && deferredInstall) { deferredInstall.prompt(); deferredInstall = null; b.hidden = true; }
    });
    $('#sheet-close').addEventListener('click', closeSheet);
    $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });

    $('#c-back').addEventListener('click', () => closePlayer());
    $('#c-close').addEventListener('click', () => closePlayer());
    $('#c-prev').addEventListener('click', () => zap(-1));
    $('#c-next').addEventListener('click', () => zap(1));
    $('#c-play').addEventListener('click', togglePlay);
    $('#c-mute').addEventListener('click', () => setMuted(!(P.muted || P.vol === 0)));
    $('#c-vol').addEventListener('input', e => setVolume(parseFloat(e.target.value)));
    $('#unmute').addEventListener('click', () => { setMuted(false); video.muted = false; });
    $('#c-fs').addEventListener('click', toggleFs);
    $('#c-pip').addEventListener('click', togglePip);
    $('#c-fav').addEventListener('click', toggleFav);
    $('#c-fav2').addEventListener('click', toggleFav);
    $('#c-q').addEventListener('click', chooseQuality);
    $('#c-src').addEventListener('click', () => { P.tab = 'src'; renderSide(); if (window.innerWidth < 1000) $('#side').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('#tab-ch').addEventListener('click', () => { P.tab = 'ch'; renderSide(); });
    $('#tab-src').addEventListener('click', () => { P.tab = 'src'; renderSide(); });
    video.addEventListener('pause', syncCtl); video.addEventListener('play', syncCtl);

    const stage = $('#stage');
    let t0 = null, lastTap = 0;
    stage.addEventListener('touchstart', e => { const t = e.touches[0]; t0 = { x: t.clientX, y: t.clientY, at: Date.now() }; }, { passive: true });
    stage.addEventListener('touchend', e => {
      if (!t0) return; const t = e.changedTouches[0];
      const dx = t.clientX - t0.x, dy = t0.y - t.clientY, dt = Date.now() - t0.at; t0 = null;
      if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx) * 1.5 && dt < 700) { zap(dy > 0 ? 1 : -1); return; }
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        const now = Date.now();
        if (now - lastTap < 320) { toggleFs(); lastTap = 0; } else { lastTap = now; poke(); showOsd(P.ch); }
      }
    }, { passive: true });
    stage.addEventListener('dblclick', toggleFs);
    $('#player').addEventListener('mousemove', poke);

    document.addEventListener('keydown', e => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName);
      if (e.key === 'Escape') {
        if (!$('#sheet').hidden) { closeSheet(); return; }
        if (document.fullscreenElement || $('#player').classList.contains('fs')) { if (!document.fullscreenElement) $('#player').classList.remove('fs'); return; }
        if (!$('#player').hidden) { closePlayer(); return; }
        if (typing) { e.target.value = ''; renderSearch(''); e.target.blur(); }
        return;
      }
      if (typing || !$('#sheet').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
      const open = !$('#player').hidden;
      if (/^[0-9]$/.test(e.key)) { typeDigit(e.key); e.preventDefault(); return; }
      if (e.key === '/' && !open) { $('#q').focus(); e.preventDefault(); return; }
      if (!open) return;
      poke();
      switch (e.key) {
        case 'ArrowUp': case 'PageUp': case 'ChannelUp': zap(1); break;
        case 'ArrowDown': case 'PageDown': case 'ChannelDown': zap(-1); break;
        case 'ArrowRight': setVolume(P.vol + 0.1); toast(`Volume ${Math.round(P.vol * 100)}%`, 900); break;
        case 'ArrowLeft': setVolume(P.vol - 0.1); toast(`Volume ${Math.round(P.vol * 100)}%`, 900); break;
        case ' ': case 'k': case 'MediaPlayPause': if (document.activeElement && document.activeElement.tagName === 'BUTTON' && e.key === ' ') return; togglePlay(); break;
        case 'm': case 'M': setMuted(!P.muted); break;
        case 'f': case 'F': toggleFs(); break;
        case 's': case 'S': if (P.ch && P.ch.sources.length > 1) { const i = (P.idx + 1) % P.ch.sources.length; openChannel(P.ch.id, { src: i }); toast('Fonte ' + (i + 1)); } break;
        case 'Backspace': closePlayer(); break;
        default: return;
      }
      e.preventDefault();
    });

    window.addEventListener('popstate', () => { if (!$('#player').hidden && !(history.state && history.state.tvl === 'player')) closePlayer(true); });
    window.addEventListener('hashchange', () => { const m = location.hash.match(/^#ch=([\w-]+)/); if (m && byId.has(m[1]) && (!P.ch || P.ch.id !== m[1])) openChannel(m[1]); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && P.started) requestWake(); });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) { try { screen.orientation.unlock(); } catch { /* opcional */ } } poke(); });
    window.addEventListener('online', () => toast('Conexão restabelecida'));
    window.addEventListener('offline', () => toast('Sem internet'));
  }

  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; $('#menu-install').hidden = false; });

  /* ---------------- início ---------------- */
  function init() {
    buildChannels();
    bind();
    $('#c-vol').value = P.vol;
    renderHome();
    const m = location.hash.match(/^#ch=([\w-]+)/);
    history.replaceState({ tvl: 'home' }, '', location.pathname + location.search);
    if (m && byId.has(m[1])) openChannel(m[1]);
    const comm = store.get('community', null);
    if (!comm || Date.now() - comm.at > 7 * DAY) setTimeout(() => updateSources(false).catch(() => {}), 2500);
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  window.TVL = { P, openChannel, closePlayer, zap, runDiagnostic, updateSources, probe, parseM3U, parseFreeTv, allowedUrl, chStatus: id => chStatus(byId.get(id)), channels: () => channels, status: () => status, version: VERSION };
  init();
})();
