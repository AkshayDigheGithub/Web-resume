/* =========================================================
   Akshay Dighe — web resume
   Progressive enhancement: the HTML is the source of truth,
   every feature below layers on top of it.
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Anything that "activates when scrolled into view" registers here. A plain
     sweep on every scroll frame is used instead of IntersectionObserver, which
     can miss elements that enter and leave the viewport between frames and
     would leave content stranded at opacity 0. */
  var sweepFns = [];
  function sweep() { sweepFns.forEach(function (fn) { fn(); }); }

  /* ---------------------------------------------------- theme */
  var THEME_KEY = 'ad-resume-theme';
  function readStore(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function writeStore(key, val) { try { localStorage.setItem(key, val); } catch (e) { /* private mode */ } }

  var savedTheme = readStore(THEME_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') root.setAttribute('data-theme', savedTheme);

  function currentTheme() {
    return root.getAttribute('data-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function toggleTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    writeStore(THEME_KEY, next);
    toast('Switched to ' + next + ' theme');
  }
  var themeBtn = $('#themeBtn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  var printBtn = $('#printBtn');
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });

  /* ---------------------------------------------------- toast */
  var toastEl = $('#toast');
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* ---------------------------------------------------- copy to clipboard */
  $$('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var label = btn.getAttribute('data-label') || 'Value';
      copyText(text).then(function (ok) {
        toast(ok ? label + ' copied' : 'Copy failed — select the text instead');
      });
    });
  });

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; })
        .catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  /* ---------------------------------------------------- scroll progress */
  var bar = $('#scrollBar');
  var toTop = $('#toTop');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      if (bar) bar.style.width = pct.toFixed(2) + '%';
      if (toTop) toTop.hidden = window.scrollY < 600;
      sweep();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------------------------------------------------- reveal on scroll */
  var pendingReveal = $$('.reveal');
  if (reduceMotion) {
    pendingReveal.forEach(function (el) { el.classList.add('in'); });
    pendingReveal = [];
  }
  sweepFns.push(function () {
    if (!pendingReveal.length) return;
    var limit = window.innerHeight * 0.96;
    pendingReveal = pendingReveal.filter(function (el) {
      if (el.getBoundingClientRect().top >= limit) return true;
      el.classList.add('in');
      return false;
    });
  });

  /* ---------------------------------------------------- active section in nav */
  var navLinks = $$('.navlinks a');
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-72px 0px -65% 0px', threshold: 0 });
    sections.forEach(function (s) { navObs.observe(s); });
  }

  /* ---------------------------------------------------- animated stat counters */
  var counters = $$('.stat strong[data-count]');
  function runCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    if (isNaN(target)) return;
    if (reduceMotion) { el.textContent = target + suffix; return; }
    var start = performance.now();
    var dur = 900;
    (function step(now) {
      var t = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + (t === 1 ? suffix : '');
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }
  var pendingCounters = counters.slice();
  sweepFns.push(function () {
    if (!pendingCounters.length) return;
    var limit = window.innerHeight * 0.9;
    pendingCounters = pendingCounters.filter(function (el) {
      if (el.getBoundingClientRect().top >= limit) return true;
      runCounter(el);
      return false;
    });
  });

  /* =========================================================
     Project filtering — the heart of the interactive layer
     ========================================================= */
  var projects = $$('#projectList .project');
  var searchInput = $('#projectSearch');
  var chipsBox = $('#filterChips');
  var statusEl = $('#filterStatus');
  var clearBtn = $('#clearFilters');
  var emptyState = $('#emptyState');

  var EMPLOYERS = {
    softdel:  'SoftDel Systems',
    cyncly:   'Twenty Twenty (Cyncly)',
    rapidera: 'Rapidera Technologies',
    softains: 'Softains Technologies'
  };

  /* index the projects once, from the markup */
  var index = projects.map(function (el) {
    var title = $('h3', el);
    var badge = $('.badge', el);
    var techs = (el.getAttribute('data-tech') || '').split(',')
      .map(function (t) { return t.trim(); }).filter(Boolean);
    title.setAttribute('data-title', title.textContent);
    return {
      el: el,
      titleEl: title,
      title: title.textContent,
      badge: badge ? badge.textContent.trim() : '',
      employer: el.getAttribute('data-employer') || '',
      techs: techs,
      haystack: (title.textContent + ' ' + (badge ? badge.textContent : '') + ' ' +
                 techs.join(' ') + ' ' + el.textContent).toLowerCase()
    };
  });

  /* technology → projects, derived from the cards themselves */
  var techMap = {};
  index.forEach(function (p) {
    p.techs.forEach(function (t) {
      (techMap[t] = techMap[t] || []).push(p);
    });
  });
  var techRanked = Object.keys(techMap).sort(function (a, b) {
    var d = techMap[b].length - techMap[a].length;
    return d !== 0 ? d : a.localeCompare(b);
  });

  var state = { techs: [], employer: null, query: '' };

  function hasTech(t) { return state.techs.indexOf(t) !== -1; }

  function setFilters(next, opts) {
    state.techs = next.techs !== undefined ? next.techs : state.techs;
    state.employer = next.employer !== undefined ? next.employer : state.employer;
    state.query = next.query !== undefined ? next.query : state.query;
    apply(opts || {});
  }

  function clearAll(opts) {
    state.techs = [];
    state.employer = null;
    state.query = '';
    if (searchInput) searchInput.value = '';
    apply(opts || {});
  }

  function matches(p) {
    if (state.techs.length) {
      var any = state.techs.some(function (t) { return p.techs.indexOf(t) !== -1; });
      if (!any) return false;
    }
    if (state.employer && p.employer !== state.employer) return false;
    if (state.query && p.haystack.indexOf(state.query) === -1) return false;
    return true;
  }

  function highlight(p) {
    var q = state.query;
    if (!q) { p.titleEl.textContent = p.title; return; }
    var i = p.title.toLowerCase().indexOf(q);
    if (i === -1) { p.titleEl.textContent = p.title; return; }
    p.titleEl.textContent = '';
    p.titleEl.appendChild(document.createTextNode(p.title.slice(0, i)));
    var mark = document.createElement('mark');
    mark.textContent = p.title.slice(i, i + q.length);
    p.titleEl.appendChild(mark);
    p.titleEl.appendChild(document.createTextNode(p.title.slice(i + q.length)));
  }

  function describe(shown) {
    if (!state.techs.length && !state.employer && !state.query) {
      return 'Showing all ' + projects.length + ' projects.';
    }
    var parts = [];
    if (state.techs.length) parts.push('using ' + listPhrase(state.techs, 'or'));
    if (state.employer) parts.push('at ' + (EMPLOYERS[state.employer] || state.employer));
    if (state.query) parts.push('matching “' + state.query + '”');
    return 'Showing ' + shown + ' of ' + projects.length + ' projects ' + parts.join(', ') + '.';
  }

  function listPhrase(arr, joiner) {
    if (arr.length === 1) return arr[0];
    return arr.slice(0, -1).join(', ') + ' ' + joiner + ' ' + arr[arr.length - 1];
  }

  function apply(opts) {
    var shown = 0;
    index.forEach(function (p) {
      var ok = matches(p);
      p.el.hidden = !ok;
      if (ok) { shown++; highlight(p); }
    });

    if (statusEl) statusEl.textContent = describe(shown);
    if (emptyState) emptyState.hidden = shown !== 0;
    var active = state.techs.length || state.employer || state.query;
    if (clearBtn) clearBtn.hidden = !active;

    $$('.chip', chipsBox).forEach(function (chip) {
      chip.setAttribute('aria-pressed', String(hasTech(chip.getAttribute('data-tech'))));
    });
    $$('.tags[data-filterable] li').forEach(function (li) {
      li.classList.toggle('picked', hasTech(li.textContent.trim()));
    });
    $$('.bar-row').forEach(function (row) {
      row.setAttribute('aria-pressed', String(hasTech(row.getAttribute('data-tech'))));
    });

    syncUrl();
    if (opts.scroll) scrollToProjects();
  }

  function scrollToProjects() {
    var target = $('#projects');
    if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function syncUrl() {
    if (!window.history || !history.replaceState) return;
    var params = new URLSearchParams();
    if (state.techs.length) params.set('tech', state.techs.join(','));
    if (state.employer) params.set('from', state.employer);
    if (state.query) params.set('q', state.query);
    var qs = params.toString();
    try {
      history.replaceState(null, '', qs ? '?' + qs + location.hash : location.pathname + location.hash);
    } catch (e) { /* file:// disallows replaceState */ }
  }

  function readUrl() {
    var params;
    try { params = new URLSearchParams(location.search); } catch (e) { return; }
    var tech = params.get('tech');
    if (tech) {
      state.techs = tech.split(',').map(function (t) { return t.trim(); })
        .filter(function (t) { return techMap[t]; });
    }
    var from = params.get('from');
    if (from && EMPLOYERS[from]) state.employer = from;
    var q = params.get('q');
    if (q) {
      state.query = q.toLowerCase();
      if (searchInput) searchInput.value = q;
    }
  }

  /* chips: the technologies that appear in more than one project */
  if (chipsBox) {
    var chipTechs = techRanked.filter(function (t) { return techMap[t].length > 1; }).slice(0, 12);
    chipTechs.forEach(function (t) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.setAttribute('data-tech', t);
      chip.setAttribute('aria-pressed', 'false');
      chip.innerHTML = '';
      chip.appendChild(document.createTextNode(t));
      var n = document.createElement('span');
      n.className = 'n';
      n.textContent = techMap[t].length;
      chip.appendChild(n);
      chip.addEventListener('click', function () { toggleTech(t); });
      chipsBox.appendChild(chip);
    });
  }

  function toggleTech(t, opts) {
    var next = state.techs.slice();
    var i = next.indexOf(t);
    if (i === -1) next.push(t); else next.splice(i, 1);
    setFilters({ techs: next }, opts);
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      setFilters({ query: searchInput.value.trim().toLowerCase() });
    });
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { searchInput.value = ''; setFilters({ query: '' }); searchInput.blur(); }
    });
  }
  if (clearBtn) clearBtn.addEventListener('click', function () { clearAll(); });
  $$('[data-clear]').forEach(function (b) { b.addEventListener('click', function () { clearAll(); }); });

  /* clicking a skill tag filters the projects */
  $$('.tags[data-filterable] li').forEach(function (li) {
    var t = li.textContent.trim();
    li.setAttribute('tabindex', '0');
    li.setAttribute('role', 'button');
    li.setAttribute('aria-label', 'Filter projects by ' + t);
    function activate() {
      if (!techMap[t]) { toast('No flagship project lists ' + t); return; }
      toggleTech(t, { scroll: true });
    }
    li.addEventListener('click', activate);
    li.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
  });

  /* "View N related projects" on each role */
  $$('[data-show-employer]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var emp = btn.getAttribute('data-show-employer');
      setFilters({ employer: state.employer === emp ? null : emp, techs: [], query: '' }, { scroll: true });
      if (searchInput) searchInput.value = '';
    });
  });

  /* =========================================================
     Technology focus — one series, one hue, ranked bars
     ========================================================= */
  var barsBox = $('#techBars');
  var tooltip = $('#tooltip');
  var TOP_N = 8;
  var charted = techRanked.slice(0, TOP_N);

  if (barsBox && charted.length) {
    var maxCount = techMap[charted[0]].length;

    charted.forEach(function (t) {
      var count = techMap[t].length;
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'bar-row';
      row.setAttribute('data-tech', t);
      row.setAttribute('aria-pressed', 'false');
      row.setAttribute('aria-label',
        t + ': ' + count + ' of ' + projects.length + ' projects. Select to filter.');

      var label = document.createElement('span');
      label.className = 'bar-label';
      label.textContent = t;

      var track = document.createElement('span');
      track.className = 'bar-track';
      var fill = document.createElement('span');
      fill.className = 'bar-fill';
      fill.setAttribute('data-w', ((count / maxCount) * 100).toFixed(1) + '%');
      track.appendChild(fill);

      var value = document.createElement('span');
      value.className = 'bar-value';
      value.textContent = count;

      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(value);

      row.addEventListener('click', function () { toggleTech(t, { scroll: true }); });
      row.addEventListener('mouseenter', function (e) { showTip(e, t); });
      row.addEventListener('mousemove', function (e) { moveTip(e); });
      row.addEventListener('mouseleave', hideTip);
      row.addEventListener('focus', function () { showTipAt(row, t); });
      row.addEventListener('blur', hideTip);

      barsBox.appendChild(row);
    });

    /* grow the bars once the chart scrolls into view */
    var fills = $$('.bar-fill', barsBox);
    function growBars() { fills.forEach(function (f) { f.style.width = f.getAttribute('data-w'); }); }
    if (reduceMotion) {
      growBars();
    } else {
      var grown = false;
      sweepFns.push(function () {
        if (grown || barsBox.getBoundingClientRect().top >= window.innerHeight * 0.9) return;
        growBars();
        grown = true;
      });
    }

    /* table view of the same numbers */
    var tbody = $('#techTable tbody');
    if (tbody) {
      techRanked.forEach(function (t) {
        var tr = document.createElement('tr');
        [t, String(techMap[t].length), techMap[t].map(function (p) { return p.title; }).join(', ')]
          .forEach(function (text, i) {
            var cell = document.createElement(i === 0 ? 'th' : 'td');
            if (i === 0) cell.setAttribute('scope', 'row');
            cell.textContent = text;
            tr.appendChild(cell);
          });
        tbody.appendChild(tr);
      });
    }
  }

  function tipHtml(t) {
    var names = techMap[t].map(function (p) { return p.title; });
    tooltip.textContent = '';
    var strong = document.createElement('strong');
    strong.textContent = t + ' — ' + names.length + ' of ' + projects.length + ' projects';
    tooltip.appendChild(strong);
    tooltip.appendChild(document.createTextNode(names.join(' · ')));
  }
  function showTip(e, t) { if (!tooltip) return; tipHtml(t); tooltip.hidden = false; moveTip(e); }
  function showTipAt(el, t) {
    if (!tooltip) return;
    tipHtml(t);
    tooltip.hidden = false;
    var r = el.getBoundingClientRect();
    place(r.left + 12, r.bottom + 8);
  }
  function moveTip(e) { if (tooltip && !tooltip.hidden) place(e.clientX + 14, e.clientY + 16); }
  function place(x, y) {
    var r = tooltip.getBoundingClientRect();
    tooltip.style.left = Math.min(x, window.innerWidth - r.width - 12) + 'px';
    tooltip.style.top = Math.min(y, window.innerHeight - r.height - 12) + 'px';
  }
  function hideTip() { if (tooltip) tooltip.hidden = true; }

  /* =========================================================
     Command palette
     ========================================================= */
  var dialog = $('#palette');
  var paletteBtn = $('#paletteBtn');
  var paletteInput = $('#paletteInput');
  var paletteList = $('#paletteList');
  var cursor = 0;
  var visible = [];

  var ICON = {
    section: 'M4 6h16M4 12h16M4 18h10',
    project: 'M3 7h7l2 2h9v10H3z',
    action:  'M13 2L4 14h7l-1 8 9-12h-7z'
  };

  function buildCommands() {
    var cmds = [];
    $$('.navlinks a').forEach(function (link) {
      cmds.push({
        label: link.textContent.trim(), meta: 'Section', icon: 'section',
        run: function () { document.querySelector(link.getAttribute('href')).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); }
      });
    });
    index.forEach(function (p) {
      cmds.push({
        label: p.title, meta: 'Project', icon: 'project',
        run: function () {
          clearAll();
          p.el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        }
      });
    });
    cmds.push({ label: 'Toggle light / dark theme', meta: 'Action', icon: 'action', run: toggleTheme });
    cmds.push({ label: 'Print / save as PDF', meta: 'Action', icon: 'action', run: function () { window.print(); } });
    cmds.push({
      label: 'Copy email address', meta: 'Action', icon: 'action',
      run: function () { copyText('digheakshay2014@gmail.com').then(function (ok) { toast(ok ? 'Email copied' : 'Copy failed'); }); }
    });
    cmds.push({
      label: 'Copy phone number', meta: 'Action', icon: 'action',
      run: function () { copyText('+919921437557').then(function (ok) { toast(ok ? 'Phone number copied' : 'Copy failed'); }); }
    });
    cmds.push({
      label: 'Open GitHub profile', meta: 'Action', icon: 'action',
      run: function () { window.open('https://github.com/AkshayDigheGithub', '_blank', 'noopener'); }
    });
    cmds.push({ label: 'Clear all project filters', meta: 'Action', icon: 'action', run: function () { clearAll(); } });
    return cmds;
  }
  var COMMANDS = buildCommands();

  function renderPalette(query) {
    if (!paletteList) return;
    var q = (query || '').trim().toLowerCase();
    visible = q ? COMMANDS.filter(function (c) { return c.label.toLowerCase().indexOf(q) !== -1; }) : COMMANDS;
    cursor = 0;
    paletteList.textContent = '';

    if (!visible.length) {
      var none = document.createElement('li');
      none.className = 'none';
      none.textContent = 'Nothing matches “' + query + '”';
      paletteList.appendChild(none);
      return;
    }
    visible.forEach(function (cmd, i) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === 0));
      li.id = 'pal-' + i;

      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', ICON[cmd.icon] || ICON.action);
      svg.appendChild(path);

      var text = document.createElement('span');
      text.textContent = cmd.label;
      var meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = cmd.meta;

      li.appendChild(svg);
      li.appendChild(text);
      li.appendChild(meta);
      li.addEventListener('click', function () { runCommand(i); });
      li.addEventListener('mousemove', function () { moveCursor(i); });
      paletteList.appendChild(li);
    });
    if (paletteInput) paletteInput.setAttribute('aria-activedescendant', 'pal-0');
  }

  function moveCursor(next) {
    if (!visible.length) return;
    cursor = (next + visible.length) % visible.length;
    $$('li', paletteList).forEach(function (li, i) {
      li.setAttribute('aria-selected', String(i === cursor));
    });
    if (paletteInput) paletteInput.setAttribute('aria-activedescendant', 'pal-' + cursor);
    var active = paletteList.children[cursor];
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
  }

  function runCommand(i) {
    var cmd = visible[i];
    closePalette();
    if (cmd) setTimeout(cmd.run, 10);
  }

  function openPalette() {
    if (!dialog || !dialog.showModal) { if (searchInput) searchInput.focus(); return; }
    renderPalette('');
    if (paletteInput) paletteInput.value = '';
    dialog.showModal();
    if (paletteInput) paletteInput.focus();
  }
  function closePalette() { if (dialog && dialog.open) dialog.close(); }

  if (paletteBtn) paletteBtn.addEventListener('click', openPalette);
  if (paletteInput) {
    paletteInput.addEventListener('input', function () { renderPalette(paletteInput.value); });
    paletteInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); moveCursor(cursor + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveCursor(cursor - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); runCommand(cursor); }
    });
  }
  if (dialog) {
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) closePalette();   /* click on the backdrop */
    });
  }

  /* ---------------------------------------------------- global shortcuts */
  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      dialog && dialog.open ? closePalette() : openPalette();
      return;
    }
    if (typing) return;
    if (e.key === '/') {
      e.preventDefault();
      if (searchInput) { $('#projects').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); searchInput.focus(); }
    }
  });

  /* ---------------------------------------------------- printing shows everything */
  window.addEventListener('beforeprint', function () {
    if (state.techs.length || state.employer || state.query) clearAll();
  });

  /* ---------------------------------------------------- go */
  readUrl();
  apply({});
  onScroll();
  window.addEventListener('load', onScroll);
})();
