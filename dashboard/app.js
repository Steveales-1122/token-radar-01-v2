// Token Radar v2 dashboard — no framework, no network. Reads window.RADAR from data.js.
//
// Views: Board (ranked, searchable, filterable), Velocity (momentum board), Categories,
// Chains, Watchlist (stars + alerts, kept in this browser), Model sandbox (sliders re-run
// the same scoring in the page). Click any row for its farm plan and model breakdown.

(function () {
  'use strict';

  var R = window.RADAR;
  if (!R || !Array.isArray(R.rows)) {
    document.body.innerHTML = '<p style="padding:24px">Token Radar: no data — data.js did not load.</p>';
    return;
  }

  var rows = R.rows;
  var WL_KEY = 'token-radar-v2-watchlist';
  var ALERT_KEY = 'token-radar-v2-alert-pct';

  /** The watchlist: a set of slugs, kept in this browser only. */
  function loadWatchlist() {
    try {
      var raw = localStorage.getItem(WL_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(list) ? list : []);
    } catch (e) {
      return new Set();
    }
  }
  var watchlist = loadWatchlist();
  function saveWatchlist() {
    try {
      localStorage.setItem(WL_KEY, JSON.stringify(Array.from(watchlist)));
    } catch (e) { /* private mode: the watchlist just does not persist */ }
  }

  /** $1,234,567 — whole dollars, no cents. */
  function money(n) {
    if (n === null || n === undefined) return '—';
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  /** +12.5% / −4.0% / — when the snapshot carries none. */
  function pct(n) {
    if (n === null || n === undefined) return '—';
    var sign = n > 0 ? '+' : n < 0 ? '−' : '';
    return sign + Math.abs(n).toFixed(1) + '%';
  }

  function ageText(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days < 30) return days + 'd';
    if (days < 365) return Math.round(days / 30) + 'mo';
    return (days / 365).toFixed(1) + 'y';
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function bySlug(slug) {
    for (var i = 0; i < rows.length; i++) if (rows[i].slug === slug) return rows[i];
    return null;
  }

  /* ---------- header + risk cards ---------- */

  var meta = document.getElementById('meta');
  meta.innerHTML =
    '<b>' + rows.length + '</b> pre-token protocols ranked · ' +
    '<b>' + R.watchlist_size + '</b> on the watchlist · ' +
    '<b>' + R.early_size + '</b> early finds below the floor<br>' +
    'Snapshot ' + esc(R.as_of) + ' · floor ' + money(R.floor_usd) + ' · model ' + esc(R.model_version);
  document.getElementById('foot-source').textContent = 'Source: ' + R.source + '. Snapshot frozen 2026-11-14; the radar reads it, it never fetches anything live.';

  var risk = R.risk || { low: 0, medium: 0, high: 0 };
  document.getElementById('risk-cards').innerHTML =
    '<div class="card low"><div class="n">' + risk.low + '</div><div class="l">Low risk rows</div></div>' +
    '<div class="card medium"><div class="n">' + risk.medium + '</div><div class="l">Medium risk rows</div></div>' +
    '<div class="card high"><div class="n">' + risk.high + '</div><div class="l">High risk rows</div></div>' +
    '<div class="card"><div class="n">' + (R.velocity ? R.velocity.length : 0) + '</div><div class="l">Velocity board rows</div></div>' +
    '<div class="card"><div class="n">' + (R.categories ? R.categories.length : 0) + '</div><div class="l">Categories tracked</div></div>' +
    '<div class="card"><div class="n">' + (R.chains ? R.chains.length : 0) + '</div><div class="l">Chains tracked</div></div>';

  /* ---------- scatter: implied value vs TVL, coloured by risk ---------- */

  (function scatter() {
    var svg = document.getElementById('scatter');
    var W = 720, H = 300, pad = 34;
    var xs = rows.map(function (r) { return Math.log10(Math.max(1, r.tvl_usd)); });
    var ys = rows.map(function (r) { return Math.log10(Math.max(1, r.implied_value_usd)); });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var X = function (v) { return pad + ((v - x0) / (x1 - x0 || 1)) * (W - pad * 2); };
    var Y = function (v) { return H - pad - ((v - y0) / (y1 - y0 || 1)) * (H - pad * 2); };
    var color = { Low: '#34d399', Medium: '#fbbf24', High: '#f87171' };
    var out = '';
    out += '<line x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - pad) + '" y2="' + (H - pad) + '" stroke="#24304f"/>';
    out += '<line x1="' + pad + '" y1="' + pad + '" x2="' + pad + '" y2="' + (H - pad) + '" stroke="#24304f"/>';
    out += '<text x="' + (W - pad) + '" y="' + (H - 10) + '" fill="#93a1c0" font-size="11" text-anchor="end">TVL (log) →</text>';
    out += '<text x="10" y="16" fill="#93a1c0" font-size="11">implied value (log) ↑</text>';
    rows.forEach(function (r, i) {
      var cx = X(xs[i]).toFixed(1), cy = Y(ys[i]).toFixed(1);
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="' + (color[r.risk_tier] || '#93a1c0') + '" opacity="0.75"><title>' +
        esc(r.name) + ' — TVL ' + money(r.tvl_usd) + ', implied ' + money(r.implied_value_usd) + ', ' + r.risk_tier + ' risk</title></circle>';
    });
    svg.innerHTML = out;
  })();

  /* ---------- tabs ---------- */

  var tabs = document.getElementById('tabs');
  tabs.addEventListener('click', function (ev) {
    var btn = ev.target.closest('button[data-view]');
    if (!btn) return;
    var view = btn.getAttribute('data-view');
    tabs.querySelectorAll('button').forEach(function (b) { b.classList.toggle('active', b === btn); });
    document.querySelectorAll('.view').forEach(function (s) { s.classList.toggle('active', s.id === 'view-' + view); });
    document.getElementById('controls').style.display = view === 'board' ? '' : 'none';
    if (view === 'watchlist') renderWatchlist();
  });

  /* ---------- board: filters, sort, pagination ---------- */

  var shown = 50;
  var qEl = document.getElementById('q');
  var catEl = document.getElementById('f-cat');
  var chainEl = document.getElementById('f-chain');
  var riskEl = document.getElementById('f-risk');
  var sortEl = document.getElementById('f-sort');
  var watchEl = document.getElementById('f-watch');
  var tbody = document.querySelector('#board tbody');

  var cats = Array.from(new Set(rows.map(function (r) { return r.category || 'Uncategorized'; }))).sort();
  cats.forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c;
    catEl.appendChild(o);
  });
  var chains = Array.from(new Set(rows.flatMap(function (r) { return r.chains; }))).sort();
  chains.forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c;
    chainEl.appendChild(o);
  });

  function filteredRows() {
    var q = qEl.value.trim().toLowerCase();
    var cat = catEl.value, chain = chainEl.value, riskTier = riskEl.value;
    var list = rows.filter(function (r) {
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.toLowerCase().indexOf(q) < 0) return false;
      if (cat && (r.category || 'Uncategorized') !== cat) return false;
      if (chain && r.chains.indexOf(chain) < 0) return false;
      if (riskTier && r.risk_tier !== riskTier) return false;
      if (watchEl.checked && !watchlist.has(r.slug)) return false;
      return true;
    });
    var sort = sortEl.value;
    var key = {
      implied: function (r) { return r.implied_value_usd; },
      velocity: function (r) { return r.velocity_score; },
      riskadj: function (r) { return r.risk_adjusted_usd; },
      tvl: function (r) { return r.tvl_usd; },
      age: function (r) { return -(r.age_days === null ? 1e9 : r.age_days); },
    }[sort];
    return list.slice().sort(function (a, b) { return key(b) - key(a) || a.slug.localeCompare(b.slug); });
  }

  function rowHtml(r, rank) {
    var chg = r.change_7d;
    var chgCls = chg === null ? '' : chg > 0 ? 'up' : chg < 0 ? 'down' : '';
    var star = watchlist.has(r.slug) ? 'on' : '';
    return '<tr data-slug="' + esc(r.slug) + '">' +
      '<td>' + rank + '</td>' +
      '<td><span class="name">' + esc(r.name) + '</span><span class="slug">' + esc(r.slug) + '</span></td>' +
      '<td>' + esc(r.category || '—') + '</td>' +
      '<td>' + r.chains.map(function (c) { return '<span class="tag-chip">' + esc(c) + '</span>'; }).join(' ') + '</td>' +
      '<td class="num">' + money(r.tvl_usd) + '</td>' +
      '<td class="num ' + chgCls + '">' + pct(chg) + '</td>' +
      '<td class="num"><b>' + money(r.implied_value_usd) + '</b></td>' +
      '<td><span class="vel"><span class="bar" style="width:' + Math.round(r.velocity_score) + 'px"></span>' + r.velocity_score.toFixed(0) + '</span></td>' +
      '<td><span class="risk ' + r.risk_tier + '">' + r.risk_tier + '</span></td>' +
      '<td><button class="star ' + star + '" data-star="' + esc(r.slug) + '" aria-label="Watch ' + esc(r.name) + '">' + (watchlist.has(r.slug) ? '★' : '☆') + '</button></td>' +
      '</tr>';
  }

  function renderBoard() {
    var list = filteredRows();
    document.getElementById('board-count').textContent = 'showing ' + Math.min(shown, list.length) + ' of ' + list.length + ' rows';
    tbody.innerHTML = list.slice(0, shown).map(function (r, i) { return rowHtml(r, i + 1); }).join('');
    document.getElementById('more-rows').style.display = list.length > shown ? '' : 'none';
    document.getElementById('wl-count').textContent = String(watchlist.size);
  }

  [qEl, catEl, chainEl, riskEl, sortEl, watchEl].forEach(function (el) {
    el.addEventListener('input', function () { shown = 50; renderBoard(); });
    el.addEventListener('change', function () { shown = 50; renderBoard(); });
  });
  document.getElementById('more-rows').addEventListener('click', function () {
    shown += 50;
    renderBoard();
  });

  tbody.addEventListener('click', function (ev) {
    var starBtn = ev.target.closest('[data-star]');
    if (starBtn) {
      var slug = starBtn.getAttribute('data-star');
      if (watchlist.has(slug)) watchlist.delete(slug); else watchlist.add(slug);
      saveWatchlist();
      renderBoard();
      return;
    }
    var tr = ev.target.closest('tr[data-slug]');
    if (tr) openDrawer(tr.getAttribute('data-slug'));
  });

  /* ---------- velocity board ---------- */

  (function renderVelocity() {
    var body = document.querySelector('#velocity-table tbody');
    body.innerHTML = (R.velocity || []).map(function (v) {
      var chg = v.change_7d;
      var chgCls = chg === null ? '' : chg > 0 ? 'up' : chg < 0 ? 'down' : '';
      return '<tr data-slug="' + esc(v.slug) + '">' +
        '<td>' + v.rank + '</td>' +
        '<td><span class="name">' + esc(v.name) + '</span><span class="slug">' + esc(v.slug) + '</span></td>' +
        '<td>' + esc(v.category || '—') + '</td>' +
        '<td class="num">' + money(v.tvl_usd) + '</td>' +
        '<td class="num ' + chgCls + '">' + pct(chg) + '</td>' +
        '<td><span class="vel"><span class="bar" style="width:' + Math.round(v.velocity_score) + 'px"></span>' + v.velocity_score.toFixed(0) + '</span></td>' +
        '<td class="num"><b>' + money(v.implied_value_usd) + '</b></td>' +
        '<td><span class="risk ' + v.risk_tier + '">' + v.risk_tier + '</span></td>' +
        '</tr>';
    }).join('');
    body.addEventListener('click', function (ev) {
      var tr = ev.target.closest('tr[data-slug]');
      if (tr) openDrawer(tr.getAttribute('data-slug'));
    });
  })();

  /* ---------- categories + chains grids ---------- */

  function statCard(item, kind) {
    var div = document.createElement('div');
    div.className = 'stat';
    div.innerHTML =
      '<h3>' + esc(item.category || item.chain) + '</h3>' +
      '<div class="big">' + money(item.tvl_usd) + '</div>' +
      '<div class="sub">' + item.count + ' protocols · avg implied ' + money(item.avg_implied_usd) +
      '<br>Top: ' + esc(item.top_name) + ' (' + money(item.top_implied_usd || 0) + ')</div>';
    div.addEventListener('click', function () {
      if (kind === 'cat') catEl.value = item.category;
      else chainEl.value = item.chain;
      document.querySelector('#tabs button[data-view="board"]').click();
      shown = 50;
      renderBoard();
      window.scrollTo(0, 0);
    });
    return div;
  }

  (function renderGrids() {
    var catGrid = document.getElementById('cat-grid');
    (R.categories || []).forEach(function (c) { catGrid.appendChild(statCard(c, 'cat')); });
    var chainGrid = document.getElementById('chain-grid');
    (R.chains || []).forEach(function (c) { chainGrid.appendChild(statCard(c, 'chain')); });
  })();

  /* ---------- watchlist + alerts ---------- */

  var alertEl = document.getElementById('alert-pct');
  try {
    var savedPct = localStorage.getItem(ALERT_KEY);
    if (savedPct !== null) alertEl.value = savedPct;
  } catch (e) { /* ignore */ }

  function renderWatchlist() {
    var body = document.querySelector('#watch-table tbody');
    var list = rows.filter(function (r) { return watchlist.has(r.slug); });
    document.getElementById('watch-empty').style.display = list.length ? 'none' : '';
    body.innerHTML = list.map(function (r, i) { return rowHtml(r, i + 1); }).join('');
    var threshold = parseFloat(alertEl.value) || 25;
    var hits = list.filter(function (r) { return r.change_7d !== null && Math.abs(r.change_7d) >= threshold; });
    document.getElementById('alert-hits').textContent = hits.length
      ? 'Alert: ' + hits.length + ' watched row(s) moved ≥ ' + threshold + '% in 7d — ' + hits.map(function (r) { return r.name + ' (' + pct(r.change_7d) + ')'; }).join(', ') + '.'
      : 'No watched row moved ≥ ' + threshold + '% in 7d.';
    document.getElementById('wl-count').textContent = String(watchlist.size);
  }

  alertEl.addEventListener('input', function () {
    try { localStorage.setItem(ALERT_KEY, alertEl.value); } catch (e) { /* ignore */ }
    renderWatchlist();
  });
  document.querySelector('#watch-table tbody').addEventListener('click', function (ev) {
    var starBtn = ev.target.closest('[data-star]');
    if (starBtn) {
      var slug = starBtn.getAttribute('data-star');
      if (watchlist.has(slug)) watchlist.delete(slug); else watchlist.add(slug);
      saveWatchlist();
      renderWatchlist();
      renderBoard();
      return;
    }
    var tr = ev.target.closest('tr[data-slug]');
    if (tr) openDrawer(tr.getAttribute('data-slug'));
  });

  /* ---------- model sandbox ---------- */

  var MULTIPLES = {
    'Dexs': 0.3, 'Lending': 0.28, 'Yield': 0.26, 'Yield Aggregator': 0.26,
    'Derivatives': 0.24, 'Perpetuals': 0.24, 'Options': 0.22, 'Prediction Market': 0.24,
    'Leveraged Farming': 0.22, 'CDP': 0.26, 'Algo-Stables': 0.2, 'Stablecoin': 0.18,
    'RWA': 0.24, 'Restaking': 0.18, 'Liquid Staking': 0.15, 'Liquid Restaking': 0.15,
    'Bridge': 0.12, 'Cross Chain': 0.14, 'CEX': 0.1, 'Insurance': 0.2, 'Gaming': 0.26,
    'NFT Marketplace': 0.22, 'Social': 0.24, 'Privacy': 0.24, 'AI': 0.28, 'Oracle': 0.26,
    'Launchpad': 0.22, 'Farm': 0.2, 'Staking': 0.18, 'Wallet': 0.2, 'Payments': 0.22,
    'DEX Aggregator': 0.26
  };
  var DEFAULT_MULTIPLE = 0.22;

  var sandbox = {
    growthWeight: R.model.growth_weight,
    maturityFloor: R.model.maturity_floor,
    riskWeight: R.model.risk_weight,
    chainBonus: R.model.chain_bonus
  };

  var SLIDERS = [
    { key: 'growthWeight', label: 'Growth weight', min: 0, max: 1, step: 0.05 },
    { key: 'maturityFloor', label: 'Maturity floor', min: 0.4, max: 0.8, step: 0.05 },
    { key: 'riskWeight', label: 'Risk weight (discount)', min: 0, max: 1, step: 0.05 },
    { key: 'chainBonus', label: 'Chain breadth bonus', min: 0, max: 0.1, step: 0.01 }
  ];

  function sandboxScore(r) {
    var growthPct = Math.min(120, Math.max(-60, r.change_7d === null ? 0 : r.change_7d));
    var growthMult = 1 + (growthPct / 100) * sandbox.growthWeight;
    var age = r.age_days === null ? 365 : r.age_days;
    var maturityMult = sandbox.maturityFloor + (Math.min(Math.max(age, 0), 1095) / 1095) * 0.4;
    var chainMult = 1 + sandbox.chainBonus * Math.min(Math.max(1, r.chains.length) - 1, 4);
    var multiple = MULTIPLES[r.category || ''] || DEFAULT_MULTIPLE;
    var implied = Math.max(1, Math.round(r.tvl_usd * multiple * growthMult * maturityMult * chainMult));
    var riskAdj = Math.max(1, Math.round(implied * (1 - (r.risk_score / 100) * sandbox.riskWeight)));
    return { implied: implied, riskAdj: riskAdj };
  }

  function renderSandbox() {
    var scored = rows.map(function (r) {
      var s = sandboxScore(r);
      return { r: r, implied: s.implied, riskAdj: s.riskAdj };
    }).sort(function (a, b) { return b.implied - a.implied; }).slice(0, 50);
    document.querySelector('#sandbox-table tbody').innerHTML = scored.map(function (x, i) {
      var r = x.r;
      var chg = r.change_7d;
      var chgCls = chg === null ? '' : chg > 0 ? 'up' : chg < 0 ? 'down' : '';
      return '<tr data-slug="' + esc(r.slug) + '">' +
        '<td>' + (i + 1) + '</td>' +
        '<td><span class="name">' + esc(r.name) + '</span><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num ' + chgCls + '">' + pct(chg) + '</td>' +
        '<td class="num"><b>' + money(x.implied) + '</b></td>' +
        '<td class="num">' + money(x.riskAdj) + '</td>' +
        '<td><span class="vel"><span class="bar" style="width:' + Math.round(r.velocity_score) + 'px"></span>' + r.velocity_score.toFixed(0) + '</span></td>' +
        '<td><span class="risk ' + r.risk_tier + '">' + r.risk_tier + '</span></td>' +
        '</tr>';
    }).join('');
  }

  var slidersEl = document.getElementById('sliders');
  SLIDERS.forEach(function (s) {
    var wrap = document.createElement('div');
    wrap.innerHTML = '<label>' + s.label + ' — <output>' + sandbox[s.key] + '</output>' +
      '<input type="range" min="' + s.min + '" max="' + s.max + '" step="' + s.step + '" value="' + sandbox[s.key] + '"></label>';
    var input = wrap.querySelector('input');
    var output = wrap.querySelector('output');
    input.addEventListener('input', function () {
      sandbox[s.key] = parseFloat(input.value);
      output.textContent = input.value;
      renderSandbox();
    });
    slidersEl.appendChild(wrap);
  });
  var resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset to submitted model';
  resetBtn.addEventListener('click', function () {
    sandbox.growthWeight = R.model.growth_weight;
    sandbox.maturityFloor = R.model.maturity_floor;
    sandbox.riskWeight = R.model.risk_weight;
    sandbox.chainBonus = R.model.chain_bonus;
    slidersEl.querySelectorAll('input[type="range"]').forEach(function (input, i) {
      input.value = sandbox[SLIDERS[i].key];
      input.closest('label').querySelector('output').textContent = input.value;
    });
    renderSandbox();
  });
  slidersEl.appendChild(resetBtn);
  document.querySelector('#sandbox-table tbody').addEventListener('click', function (ev) {
    var tr = ev.target.closest('tr[data-slug]');
    if (tr) openDrawer(tr.getAttribute('data-slug'));
  });

  /* ---------- detail drawer ---------- */

  var drawer = document.getElementById('drawer');
  var drawerBody = document.getElementById('drawer-body');

  function capitalFor(tvl) {
    if (tvl >= 5000000000) return 250;
    if (tvl >= 1000000000) return 150;
    if (tvl >= 100000000) return 100;
    return 50;
  }

  function holdDaysFor(age) {
    if (age === null || age === undefined) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }

  function actionFor(r, capital, chain) {
    var c = (r.category || '').toLowerCase();
    var name = r.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0 || c.indexOf('aggregator') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + '\'s main pool on ' + chain + ' and keep the position open.';
    if (c.indexOf('bridge') >= 0 || c.indexOf('cross chain') >= 0) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return 'Stake $' + capital + ' of the chain\'s staking asset through ' + name + ' and keep the receipt.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0 || c.indexOf('options') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedge.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' and place one market position on ' + name + '.';
    if (c.indexOf('rwa') >= 0) return 'Mint $' + capital + ' of the protocol\'s yield asset on ' + chain + ' and hold it.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy.';
    if (c.indexOf('gaming') >= 0 || c.indexOf('nft') >= 0) return 'Use $' + capital + ' inside ' + name + ' on ' + chain + ': play, trade or list once, and keep the activity on one wallet.';
    if (c.indexOf('social') >= 0 || c.indexOf('ai') >= 0) return 'Create one account on ' + name + ', connect the farm wallet, and complete its first on-chain action with $' + capital + '.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }

  function riskAdvice(flag) {
    if (flag === 'single-chain') return 'It lives on one chain only, so a bridge halt or a chain outage strands the position: keep the farm wallet small and the exit ready.';
    if (flag === 'very-young') return 'It is under 90 days old, so its points rules and its TVL can both move fast: check its own announcements weekly, not monthly.';
    if (flag === 'age-unknown') return 'The snapshot carries no listing date for it, so treat its age as unknown and size the position as if it were young.';
    if (flag === 'parabolic-7d') return 'Its TVL jumped more than 25% in a week: momentum is real, but entries after a spike often buy the top, so scale in over two weeks.';
    if (flag === 'bleeding-7d') return 'Its TVL fell more than 25% in a week: something is leaving, so find out why on its own channels before adding funds.';
    if (flag === 'tiny-tvl') return 'Its TVL is under $10M, so one whale leaving moves everything: never put more than you can withdraw in one transaction.';
    return 'Check the protocol’s own pages before acting.';
  }

  /** The six-step farm plan, generated in the page from the row's own record. */
  function farmPlan(r) {
    var chain = r.chains.length ? r.chains[0] : 'its main chain';
    var capital = capitalFor(r.tvl_usd);
    var hold = holdDaysFor(r.age_days);
    var riskText = r.risk_flags.length === 0
      ? 'This row carries no risk flag from the snapshot: it is multi-chain, established and steady over 7 days. Still verify the protocol\'s own pages before depositing.'
      : 'Risk tier ' + r.risk_tier + ' — ' + r.risk_flags.join(', ') + '. ' + r.risk_flags.map(riskAdvice).join(' ');
    var steps = [
      ['Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', 'under $3 of gas for the first transaction', '5 minutes'],
      [actionFor(r, capital, chain), '$' + capital + ' of capital and about $' + (capital >= 150 ? 8 : 4) + ' of gas', '15 minutes to set up'],
      [riskText, 'nothing but the reading', '10 minutes'],
      ['Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.', 'about $2 of gas a week', '10 minutes a week'],
      ['Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', 'the $' + capital + ' stays in the position', hold + ' days'],
      ['Before you withdraw, open the protocol\'s own points or rewards page and claim only from the link it publishes, then write the wallet, the dates and every transaction in a farm log.', 'no fee to check, and never pay to claim', '15 minutes']
    ];
    return '<h3>Farm plan</h3><ol class="steps">' + steps.map(function (s) {
      return '<li>' + esc(s[0]) + ' <span class="cost">Cost: ' + esc(s[1]) + '. Time: ' + esc(s[2]) + '.</span></li>';
    }).join('') + '</ol>';
  }

  function openDrawer(slug) {
    var r = bySlug(slug);
    if (!r) return;
    var stepsHtml = farmPlan(r);
    var flagsHtml = r.risk_flags && r.risk_flags.length
      ? r.risk_flags.map(function (f) { return '<span class="tag-chip">' + esc(f) + '</span>'; }).join('')
      : '<span class="tag-chip ok">no risk flags</span>';
    drawerBody.innerHTML =
      '<h2>' + esc(r.name) + '</h2>' +
      '<p class="sub">' + esc(r.slug) + ' · ' + esc(r.category || 'Uncategorized') + ' · listed ' + esc(r.listed_at || 'unknown') + ' (' + ageText(r.age_days) + ' old)</p>' +
      '<div class="kv">' +
      '<div><div class="k">Implied value</div><div class="v">' + money(r.implied_value_usd) + '</div></div>' +
      '<div><div class="k">Risk-adjusted</div><div class="v">' + money(r.risk_adjusted_usd) + '</div></div>' +
      '<div><div class="k">TVL</div><div class="v">' + money(r.tvl_usd) + '</div></div>' +
      '<div><div class="k">7d change</div><div class="v">' + pct(r.change_7d) + '</div></div>' +
      '<div><div class="k">Velocity</div><div class="v">' + r.velocity_score.toFixed(0) + ' / 100</div></div>' +
      '<div><div class="k">Risk</div><div class="v">' + r.risk_tier + ' (' + r.risk_score + '/100)</div></div>' +
      '</div>' +
      '<h3>Risk flags</h3><div class="flags">' + flagsHtml + '</div>' +
      '<p class="note">Risk is a proxy from the snapshot only: single-chain, very young, violent 7d swing, tiny TVL. No holder, audit or lock data exists in the snapshot.</p>' +
      '<h3>Model breakdown</h3>' +
      '<p class="formula">TVL ' + money(r.tvl_usd) + ' × category multiple ' + (MULTIPLES[r.category || ''] || DEFAULT_MULTIPLE) +
      ' × growth ' + (r.growth_multiplier || 1).toFixed(2) + ' × maturity ' + (r.maturity_multiplier || 1).toFixed(2) +
      ' = ' + money(r.implied_value_usd) + ' implied. Chains: ' + r.chains.map(esc).join(', ') + '.</p>' +
      stepsHtml;
    drawer.hidden = false;
  }

  document.getElementById('drawer-close').addEventListener('click', function () {
    drawer.hidden = true;
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') drawer.hidden = true;
  });

  renderBoard();
  renderSandbox();
})();
