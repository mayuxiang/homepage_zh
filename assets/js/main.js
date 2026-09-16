/* Site-wide behaviour. Loaded with `defer`. */

/* ---- Safe localStorage helpers ---- */
function setStoredTheme(value) {
  try {
    window.localStorage.setItem('theme', value);
  } catch (e) {
    /* storage may be blocked */
  }
}

/* ---- Mobile menu ---- */
(function () {
  var btn = document.getElementById('mobileMenuBtn');
  var nav = document.querySelector('.site-nav');
  if (!btn || !nav) return;
  btn.setAttribute('aria-expanded', 'false');

  // Single close routine reused by the button, nav links and the Escape key.
  function closeMenu(refocus) {
    nav.classList.remove('open');
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (refocus) btn.focus();
  }

  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      var first = nav.querySelector('.nav-link');
      if (first) setTimeout(function () { first.focus(); }, 100);
    } else {
      btn.focus();
    }
  });

  nav.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function () { closeMenu(true); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) closeMenu(true);
  });
})();

/* ---- Theme ---- */
function isDarkTheme() {
  return document.documentElement.hasAttribute('data-theme');
}

function syncThemeToggle() {
  var toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  toggle.setAttribute('aria-pressed', isDarkTheme() ? 'true' : 'false');
  toggle.setAttribute('aria-label', isDarkTheme() ? '切换到浅色主题' : '切换到深色主题');
  toggle.textContent = isDarkTheme() ? '☀' : '☾';
}

function applyTheme(dark) {
  if (dark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  syncThemeToggle();
}

/* Returns the user's explicit choice, or null when they never picked one. */
function storedTheme() {
  try {
    return window.localStorage.getItem('theme');
  } catch (e) {
    return null; /* storage blocked: treat as "no explicit choice" */
  }
}

/* ---- Theme toggle ---- */
(function () {
  var toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  toggle.addEventListener('click', function () {
    var dark = !isDarkTheme();
    applyTheme(dark);
    setStoredTheme(dark ? 'dark' : 'light');
  });
  syncThemeToggle();
})();

/* ---- Follow live OS theme changes (only until the user picks a theme) ---- */
(function () {
  if (!window.matchMedia) return;
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  function onChange(e) {
    if (storedTheme()) return; /* explicit choice wins over the OS */
    applyTheme(e.matches);
  }
  if (mq.addEventListener) {
    mq.addEventListener('change', onChange);
  } else if (mq.addListener) {
    mq.addListener(onChange); /* Safari < 14 */
  }
})();

/* ---- Author name highlight in publication lists ---- */
(function () {
  document.querySelectorAll('[data-highlight]').forEach(function (el) {
    var name = el.getAttribute('data-highlight');
    if (!name) return;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      var node = walker.currentNode;
      var idx = node.textContent.indexOf(name);
      if (idx === -1) continue;
      var before = node.textContent.substring(0, idx);
      var match = node.textContent.substring(idx, idx + name.length);
      var after = node.textContent.substring(idx + name.length);
      var frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      var strong = document.createElement('strong');
      strong.className = 'author-self';
      strong.textContent = match;
      frag.appendChild(strong);
      if (after) frag.appendChild(document.createTextNode(after));
      node.parentNode.replaceChild(frag, node);
    }
  });
})();

/* ---- Scroll reveal (with fallback for browsers without IntersectionObserver) ---- */
(function () {
  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  var reduce =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('visible'); });
    return;
  }
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry, i) {
        if (entry.isIntersecting) {
          setTimeout(function () { entry.target.classList.add('visible'); }, i * 60);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  els.forEach(function (el) { observer.observe(el); });
})();

/* ---- Email obfuscation - construct at runtime ---- */
(function () {
  function decode(user, domain) { return user + '@' + domain; }

  // Hero email
  var hero = document.getElementById('hero-email');
  if (hero) {
    var addr = decode(hero.getAttribute('data-user'), hero.getAttribute('data-domain'));
    hero.textContent = addr;
    hero.style.cursor = 'pointer';
    hero.addEventListener('click', function () {
      window.location.href = 'mailto:' + addr;
    });
  }

  // Team page email text
  var teamEmail = document.getElementById('team-email');
  if (teamEmail) {
    teamEmail.textContent = decode(teamEmail.getAttribute('data-user'), teamEmail.getAttribute('data-domain'));
    teamEmail.style.cursor = 'text';
  }

  // Team page email button
  var teamBtn = document.getElementById('team-email-btn');
  if (teamBtn) {
    var btnAddr = decode(teamBtn.getAttribute('data-user'), teamBtn.getAttribute('data-domain'));
    var btnSubject = teamBtn.getAttribute('data-subject') || '';
    teamBtn.addEventListener('click', function () {
      window.location.href = 'mailto:' + btnAddr + (btnSubject ? '?subject=' + encodeURIComponent(btnSubject) : '');
    });
  }
})();

/* ---- Publications year filter (no-op on pages without the filter) ---- */
(function () {
  var btns = document.querySelectorAll('.pub-year-filter button');
  var cards = document.querySelectorAll('.pub-card[data-year]');
  if (!btns.length || !cards.length) return;
  btns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      btns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var filter = btn.getAttribute('data-filter');
      cards.forEach(function (card) {
        card.style.display =
          filter === 'all' || card.getAttribute('data-year') === filter ? '' : 'none';
      });
    });
  });
})();
