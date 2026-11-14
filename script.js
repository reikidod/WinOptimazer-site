(function () {
  const header = document.getElementById('header');
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('nav');

  // Resolve the newest published installer asset (including beta releases).
  const resolveLatestInstaller = async () => {
    const links = document.querySelectorAll('[data-download-latest]');
    if (!links.length) return;
    const fallback = 'https://github.com/reikidod/WinOptimazer/releases/latest/download/WinOptimizer-Setup.exe';
    try {
      const response = await fetch('https://api.github.com/repos/reikidod/WinOptimazer/releases?per_page=1', {
        headers: { Accept: 'application/vnd.github+json' },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`GitHub Releases API: ${response.status}`);
      const releases = await response.json();
      const installer = releases.flatMap((release) => release.assets || [])
        .find((asset) => asset.name === 'WinOptimizer-Setup.exe' && asset.state === 'uploaded');
      const url = installer?.browser_download_url || fallback;
      links.forEach((link) => {
        link.href = url;
        link.removeAttribute('target');
        link.removeAttribute('rel');
      });
    } catch (error) {
      links.forEach((link) => { link.href = fallback; });
      console.warn('Не удалось определить последний установщик WinOptimizer:', error);
    }
  };
  resolveLatestInstaller();


  // Load the roadmap directly from the application's beta branch.
  const loadLiveRoadmap = async () => {
    const root = document.getElementById('roadmap-content');
    if (!root) return;
    const source = 'https://raw.githubusercontent.com/reikidod/WinOptimazer/beta/docs/ROADMAP-0.7.md';
    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    try {
      const response = await fetch(source + '?t=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const lines = (await response.text()).split(/\r?\n/);
      const stages = [];
      let current = null;
      lines.forEach((line) => {
        const heading = line.match(/^## Этап\s+(\d+)\.\s+(.+)$/);
        if (heading) {
          current = { number: heading[1], title: heading[2].replace(/\s+—\s+(выполнен|в работе)$/i, ''), tasks: [] };
          stages.push(current);
          return;
        }
        if (current) {
          const task = line.match(/^\s*-\s+\[([ xX])\]\s+(.+)$/);
          if (task) current.tasks.push({ done: task[1].toLowerCase() === 'x', text: task[2].replace(/\*\*/g, '').replace(/\[(.*?)\]\((.*?)\)/g, '$1') });
        }
      });
      if (!stages.length) throw new Error('В файле не найдены этапы разработки');
      const total = stages.reduce((sum, stage) => sum + stage.tasks.length, 0);
      const completed = stages.reduce((sum, stage) => sum + stage.tasks.filter((task) => task.done).length, 0);
      const percent = total ? Math.round(completed / total * 100) : 0;
      const stageMarkup = stages.map((stage) => {
        const done = stage.tasks.filter((task) => task.done).length, count = stage.tasks.length;
        const stagePercent = count ? Math.round(done / count * 100) : 0;
        const status = count && done === count ? 'done' : done > 0 ? 'active' : 'pending';
        const label = status === 'done' ? 'Выполнено' : status === 'active' ? 'В работе' : 'Запланировано';
        const tasks = count ? '<div class="roadmap-task-list">' + stage.tasks.map((task) =>
          '<div class="roadmap-task ' + (task.done ? 'completed' : '') + '"><span class="roadmap-task-mark">' +
          (task.done ? '✓' : '') + '</span><span class="roadmap-task-text">' + escapeHtml(task.text) + '</span></div>'
        ).join('') + '</div>' : '<p>Задачи этапа уточняются.</p>';
        return '<details class="roadmap-stage"' + (status === 'active' ? ' open' : '') + '><summary>' +
          '<span class="roadmap-stage-number">' + escapeHtml(stage.number.padStart(2, '0')) + '</span>' +
          '<span><span class="roadmap-stage-title">' + escapeHtml(stage.title) + '</span>' +
          '<span class="roadmap-stage-meta">' + done + ' из ' + count + ' задач выполнено</span></span>' +
          '<span class="roadmap-status ' + status + '">' + label + '</span></summary>' +
          '<div class="roadmap-stage-progress"><span style="width:' + stagePercent + '%"></span></div>' +
          '<div class="roadmap-stage-body">' + tasks + '</div></details>';
      }).join('');
      root.innerHTML = '<div class="roadmap-overview"><div><h3>Общий прогресс разработки</h3>' +
        '<p>Выполнение задач по актуальному плану WinOptimizer Beta</p>' +
        '<div class="roadmap-progress-track"><div class="roadmap-progress-fill" style="width:' + percent + '%"></div></div></div>' +
        '<div class="roadmap-progress-number">' + percent + '%<small>' + completed + ' / ' + total + ' задач</small></div></div>' +
        '<div class="roadmap-stages">' + stageMarkup + '</div>';
    } catch (error) {
      root.innerHTML = '<div class="roadmap-error">Не удалось загрузить актуальную дорожную карту. ' +
        '<a href="https://github.com/reikidod/WinOptimazer/blob/beta/docs/ROADMAP-0.7.md" target="_blank" rel="noopener">Открыть её на GitHub</a></div>';
      console.warn('Не удалось загрузить дорожную карту WinOptimizer:', error);
    }
  };
  loadLiveRoadmap();

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 12);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const closeMenu = ({ restoreFocus = false } = {}) => {
    nav?.classList.remove('open');
    toggle?.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Открыть меню');
    if (restoreFocus) toggle?.focus();
  };

  toggle?.addEventListener('click', () => {
    const isOpen = nav?.classList.toggle('open') ?? false;
    toggle.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
  });

  nav?.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => closeMenu());
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav?.classList.contains('open')) closeMenu({ restoreFocus: true });
  });

  document.addEventListener('click', (event) => {
    if (nav?.classList.contains('open') && !header?.contains(event.target)) closeMenu();
  });

  // Keep the active navigation item in sync with the section currently being read.
  const navLinks = [...(nav?.querySelectorAll('a[href^="#"]') || [])];
  const navSections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  const setActiveLink = (sectionId) => {
    navLinks.forEach((link) => {
      const active = link.getAttribute('href') === '#' + sectionId;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  if ('IntersectionObserver' in window && navSections.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length) setActiveLink(visible[0].target.id);
    }, { rootMargin: '-22% 0px -65% 0px', threshold: 0 });
    navSections.forEach((section) => sectionObserver.observe(section));
  }

  // Search and category filters for the knowledge hub.
  const knowledgeSearch = document.getElementById('knowledgeSearch');
  const knowledgeCards = [...document.querySelectorAll('.knowledge-card')];
  const knowledgeFilters = [...document.querySelectorAll('[data-knowledge-filter]')];
  const knowledgeEmpty = document.getElementById('knowledgeEmpty');
  let activeKnowledgeFilter = 'all';

  const filterKnowledge = () => {
    const query = (knowledgeSearch?.value || '').trim().toLocaleLowerCase('ru');
    let visibleCount = 0;
    knowledgeCards.forEach((card) => {
      const categoryMatch = activeKnowledgeFilter === 'all' || card.dataset.category === activeKnowledgeFilter;
      const searchable = (card.textContent + ' ' + (card.dataset.search || '')).toLocaleLowerCase('ru');
      const queryMatch = !query || searchable.includes(query);
      const visible = categoryMatch && queryMatch;
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    if (knowledgeEmpty) knowledgeEmpty.hidden = visibleCount !== 0;
  };

  knowledgeSearch?.addEventListener('input', filterKnowledge);
  knowledgeFilters.forEach((button) => {
    button.addEventListener('click', () => {
      activeKnowledgeFilter = button.dataset.knowledgeFilter || 'all';
      knowledgeFilters.forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      filterKnowledge();
    });
  });

  // Press "/" to focus search, except while typing in a form field.
  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const typing = target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    if (event.key === '/' && !typing && knowledgeSearch) {
      event.preventDefault();
      knowledgeSearch.focus();
    }
    if (event.key === 'Escape' && document.activeElement === knowledgeSearch) {
      knowledgeSearch.value = '';
      filterKnowledge();
      knowledgeSearch.blur();
    }
  });


  // Interactive problem-to-feature guide. Recommendations are informational only.
  const problemRecommendations = {
    slow: { title:'Начните с лёгкой оптимизации', text:'Сначала проверьте автозагрузку и свободное место, затем изучите безопасные настройки производительности. Не применяйте все твики подряд.', tags:['Лёгкий уровень','Обслуживание','Оптимизация'], href:'features/optimization.html' },
    games: { title:'Проверьте игровой раздел', text:'Изучите игровые настройки Windows, параметры GPU и доступные инструменты. Сравнивайте производительность до и после изменений в одинаковых условиях.', tags:['Средний уровень','Игры','Измерение результата'], href:'features/gaming.html' },
    storage: { title:'Начните с обслуживания диска', text:'Проверьте занятое место, временные файлы и приложения, которыми больше не пользуетесь. Перед удалением убедитесь, что данные не нужны.', tags:['Лёгкий уровень','Очистка','Приложения'], href:'features/maintenance.html' },
    privacy: { title:'Изучите настройки конфиденциальности', text:'Откройте описание каждого параметра и меняйте только те настройки, назначение которых вам понятно. Сохраняйте возможность вернуть исходное состояние.', tags:['Лёгкий / средний','Приватность','Контроль изменений'], href:'features/optimization.html' },
    unstable: { title:'Не начинайте с агрессивных твиков', text:'Сначала зафиксируйте симптомы, проверьте доступные инструменты обслуживания и подготовьте точку восстановления Windows. Не запускайте автоматические исправления без понимания причины.', tags:['Диагностика','Восстановление','Осторожный подход'], href:'features/maintenance.html' }
  };
  const problemButtons = [...document.querySelectorAll('[data-problem]')];
  const problemResult = document.getElementById('problemResult');
  problemButtons.forEach((button) => button.addEventListener('click', () => {
    const key = button.dataset.problem;
    const item = problemRecommendations[key];
    if (!item || !problemResult) return;
    problemButtons.forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle('active', active);
      candidate.setAttribute('aria-pressed', String(active));
    });
    problemResult.innerHTML = '<span class="problem-result-label">Рекомендуемый маршрут</span><h3>' +
      item.title + '</h3><p>' + item.text + '</p><div class="problem-tags">' +
      item.tags.map((tag) => '<span>' + tag + '</span>').join('') +
      '</div><a class="btn btn-accent" href="' + item.href + '">Открыть рекомендации <span aria-hidden="true">→</span></a>';
  }));

  // Searchable FAQ; native details keeps the answers keyboard-accessible.
  const faqSearch = document.getElementById('faqSearch');
  const faqItems = [...document.querySelectorAll('.faq-item')];
  const faqCount = document.getElementById('faqCount');
  const faqEmpty = document.getElementById('faqEmpty');
  const filterFaq = () => {
    const query = (faqSearch?.value || '').trim().toLocaleLowerCase('ru');
    let visible = 0;
    faqItems.forEach((item) => {
      const match = (item.textContent + ' ' + (item.dataset.search || '')).toLocaleLowerCase('ru').includes(query);
      item.hidden = !match;
      if (match) visible++;
    });
    if (faqCount) faqCount.textContent = visible + ' ' + (visible === 1 ? 'вопрос' : visible > 1 && visible < 5 ? 'вопроса' : 'вопросов');
    if (faqEmpty) faqEmpty.hidden = visible !== 0;
  };
  faqSearch?.addEventListener('input', filterFaq);

  // Release history comes from the public GitHub Releases API.
  const loadReleaseHistory = async () => {
    const root = document.getElementById('releaseList');
    if (!root) return;
    try {
      const response = await fetch('https://api.github.com/repos/reikidod/WinOptimazer/releases?per_page=6', {
        headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store'
      });
      if (!response.ok) throw new Error('GitHub API: ' + response.status);
      const releases = await response.json();
      if (!Array.isArray(releases) || !releases.length) throw new Error('Опубликованные релизы пока не найдены');
      const escapeText = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
      root.innerHTML = releases.map((release) => {
        const date = release.published_at ? new Intl.DateTimeFormat('ru-RU', { day:'numeric', month:'long', year:'numeric' }).format(new Date(release.published_at)) : 'Дата не указана';
        const notes = String(release.body || 'Описание этого обновления пока не опубликовано.').split(/\r?\n/).map(line => line.replace(/^\s*[-*#>]+\s*/, '').trim()).filter(Boolean).slice(0, 2).join(' · ');
        const kind = release.prerelease ? 'Beta' : release.draft ? 'Черновик' : 'Stable';
        return '<article class="release-item"><div class="release-marker" aria-hidden="true"></div><div class="release-content"><div class="release-meta"><span class="release-version">' + escapeText(release.tag_name || release.name || 'Релиз') + '</span><span class="release-kind ' + (release.prerelease ? 'beta' : 'stable') + '">' + kind + '</span><time datetime="' + escapeText(release.published_at || '') + '">' + date + '</time></div><h3>' + escapeText(release.name || release.tag_name || 'Обновление WinOptimizer') + '</h3><p>' + escapeText(notes) + '</p><a href="' + escapeText(release.html_url) + '" target="_blank" rel="noopener">Открыть описание обновления <span aria-hidden="true">→</span></a></div></article>';
      }).join('');
    } catch (error) {
      root.innerHTML = '<p class="release-error">Не удалось загрузить список релизов. <a href="https://github.com/reikidod/WinOptimazer/releases" target="_blank" rel="noopener">Открыть историю обновлений на GitHub</a>.</p>';
      console.warn('Не удалось загрузить историю релизов WinOptimizer:', error);
    }
  };
  loadReleaseHistory();

  // Personal website theme and device synchronization (Cloudflare Worker + D1).
  const THEME_SYNC_API = 'https://winoptimizer-theme-sync-api.aceberi86.workers.dev';
  const SITE_THEME_KEY = 'winoptimizer.siteTheme';
  const SITE_ACCENT_KEY = 'winoptimizer.siteAccent';
  const SITE_SESSION_KEY = 'winoptimizer.themeSync.webToken';
  const siteThemeSelect = document.getElementById('siteThemeSelect');
  const siteAccentSelect = document.getElementById('siteAccentSelect');
  const themePairForm = document.getElementById('themePairForm');
  const themePairCode = document.getElementById('themePairCode');
  const themePairSubmit = document.getElementById('themePairSubmit');
  const themeSyncStatus = document.getElementById('themeSyncStatus');
  const themeSyncConnection = document.getElementById('themeSyncConnection');
  const themeSyncForget = document.getElementById('themeSyncForget');

  const siteThemes = {
    dark: { bgWindow:'#1B1C1F', bgSidebar:'#202225', bgCard:'#2A2C31', bgCardHover:'#353840', border:'#3A3D44', borderHover:'#7F8CA3', accent:'#8AAAD8', accentStrong:'#4B6CA3', trackOff:'#3A3D44', textPrimary:'#F2F3F5', textSecondary:'#C2C6CE', textDim:'#A9AEB9', red:'#C0262D', redBright:'#FF5A5F' },
    light: { bgWindow:'#F3F4F7', bgSidebar:'#FFFFFF', bgCard:'#FFFFFF', bgCardHover:'#EEF1F7', border:'#D8DCE5', borderHover:'#8A94A8', accent:'#2F6FDB', accentStrong:'#2F6FDB', trackOff:'#C9CEDA', textPrimary:'#1B1E24', textSecondary:'#4A5160', textDim:'#666D7E', red:'#C0262D', redBright:'#D13F48' },
    redblack: { bgWindow:'#120C0C', bgSidebar:'#1A1010', bgCard:'#231516', bgCardHover:'#2F1B1D', border:'#43262A', borderHover:'#A04048', accent:'#FF5A5F', accentStrong:'#C0262D', trackOff:'#43262A', textPrimary:'#F5EDED', textSecondary:'#D0BFBF', textDim:'#B09A9A', red:'#C0262D', redBright:'#FF5A5F' },
    midnight: { bgWindow:'#0E1422', bgSidebar:'#121A2C', bgCard:'#18223A', bgCardHover:'#1F2C4A', border:'#2A3A5C', borderHover:'#6F8FD0', accent:'#6EA8FF', accentStrong:'#3A66C8', trackOff:'#2A3A5C', textPrimary:'#EEF2FA', textSecondary:'#BCC8DE', textDim:'#9AA8C4', red:'#C0262D', redBright:'#FF5A5F' },
    emerald: { bgWindow:'#0F1A16', bgSidebar:'#13211C', bgCard:'#1A2B25', bgCardHover:'#223830', border:'#2E4A40', borderHover:'#6FB59A', accent:'#4FD1A1', accentStrong:'#1F8F6A', trackOff:'#2E4A40', textPrimary:'#ECF5F1', textSecondary:'#BBD0C7', textDim:'#98B0A5', red:'#C0262D', redBright:'#FF5A5F' },
    violet: { bgWindow:'#17121F', bgSidebar:'#1C1626', bgCard:'#261D33', bgCardHover:'#33264A', border:'#43315F', borderHover:'#A184D6', accent:'#B48CFF', accentStrong:'#7B4FD0', trackOff:'#43315F', textPrimary:'#F3EEFA', textSecondary:'#CDC2E0', textDim:'#A99BC4', red:'#C0262D', redBright:'#FF5A5F' },
    amoled: { bgWindow:'#000000', bgSidebar:'#0A0A0A', bgCard:'#141414', bgCardHover:'#1E1E1E', border:'#2A2A2A', borderHover:'#7A7A7A', accent:'#8AAAD8', accentStrong:'#4B6CA3', trackOff:'#2A2A2A', textPrimary:'#F2F2F2', textSecondary:'#BDBDBD', textDim:'#9E9E9E', red:'#C0262D', redBright:'#FF5A5F' }
  };
  const siteAccents = {
    theme: null,
    blue: { main:'#6EA8FF', strong:'#3A66C8' },
    red: { main:'#FF6B6B', strong:'#C0392B' },
    green: { main:'#4FD1A1', strong:'#1F8F6A' },
    purple: { main:'#B48CFF', strong:'#7B4FD0' },
    orange: { main:'#FFA94D', strong:'#C46A12' },
    pink: { main:'#FF7EB6', strong:'#C23C7E' }
  };

  let currentSiteTheme = siteThemes.dark ? 'dark' : 'dark';
  let currentSiteAccent = 'theme';
  let websiteSessionToken = null;
  let lastWebsiteThemeUpdatedAt = 0;
  let themeWriteInProgress = false;

  const showThemeSyncStatus = (message) => {
    if (themeSyncStatus) themeSyncStatus.textContent = message;
  };
  const setThemeConnectionUi = (connected) => {
    if (themeSyncConnection) {
      themeSyncConnection.textContent = connected ? 'Приложение привязано к этому браузеру' : 'Не подключено';
      themeSyncConnection.classList.toggle('connected', connected);
    }
    if (themeSyncForget) themeSyncForget.hidden = !connected;
  };
  const safeStorageGet = (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const safeStorageSet = (key, value) => {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  };
  const safeStorageRemove = (key) => {
    try { localStorage.removeItem(key); } catch { /* storage may be disabled */ }
  };
  const saveSiteTheme = () => {
    safeStorageSet(SITE_THEME_KEY, currentSiteTheme);
    safeStorageSet(SITE_ACCENT_KEY, currentSiteAccent);
  };
  const applySiteTheme = (themeId, accentId, persist = true) => {
    const palette = siteThemes[themeId];
    if (!palette || !Object.prototype.hasOwnProperty.call(siteAccents, accentId)) return false;
    const accent = siteAccents[accentId];
    const primary = accent ? (themeId === 'light' ? accent.strong : accent.main) : palette.accent;
    const strong = accent ? accent.strong : palette.accentStrong;
    const variables = {
      '--bg-window': palette.bgWindow, '--bg-sidebar': palette.bgSidebar,
      '--bg-card': palette.bgCard, '--bg-card-hover': palette.bgCardHover,
      '--border': palette.border, '--border-hover': palette.borderHover,
      '--accent': primary, '--accent-strong': strong, '--track-off': palette.trackOff,
      '--text-primary': palette.textPrimary, '--text-secondary': palette.textSecondary,
      '--text-dim': palette.textDim, '--accent-red': palette.red, '--accent-red-bright': palette.redBright
    };
    Object.entries(variables).forEach(([name, value]) => document.documentElement.style.setProperty(name, value));
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', palette.bgWindow);
    currentSiteTheme = themeId;
    currentSiteAccent = accentId;
    if (siteThemeSelect) siteThemeSelect.value = themeId;
    if (siteAccentSelect) siteAccentSelect.value = accentId;
    if (persist) saveSiteTheme();
    return true;
  };

  const themeApiRequest = async (path, { method = 'GET', token = null, body = null } = {}) => {
    const headers = { Accept: 'application/json' };
    if (body !== null) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;
    const response = await fetch(THEME_SYNC_API + path, {
      method, headers, body: body === null ? undefined : JSON.stringify(body), cache: 'no-store'
    });
    let payload = {};
    try { payload = await response.json(); } catch { /* response may be empty */ }
    if (!response.ok) {
      const error = new Error(payload.error || ('HTTP ' + response.status));
      error.status = response.status;
      throw error;
    }
    return payload;
  };
  const forgetWebsiteSession = () => {
    websiteSessionToken = null;
    safeStorageRemove(SITE_SESSION_KEY);
    lastWebsiteThemeUpdatedAt = 0;
    setThemeConnectionUi(false);
  };
  const handleExpiredWebsiteSession = (error) => {
    if (error && error.status === 401) {
      forgetWebsiteSession();
      showThemeSyncStatus('Сессия сайта истекла. Создайте новый код в приложении и привяжите его снова.');
      return true;
    }
    return false;
  };
  const pushWebsiteTheme = async () => {
    if (!websiteSessionToken || themeWriteInProgress) return;
    themeWriteInProgress = true;
    try {
      const result = await themeApiRequest('/v1/theme', {
        method: 'PUT', token: websiteSessionToken,
        body: { id: currentSiteTheme, accent: currentSiteAccent }
      });
      lastWebsiteThemeUpdatedAt = Math.max(lastWebsiteThemeUpdatedAt, Number(result.updatedAt) || 0);
      showThemeSyncStatus('Тема сайта синхронизирована с приложением.');
    } catch (error) {
      if (!handleExpiredWebsiteSession(error))
        showThemeSyncStatus('Не удалось синхронизировать тему: ' + error.message);
    } finally {
      themeWriteInProgress = false;
    }
  };
  const pullWebsiteTheme = async () => {
    if (!websiteSessionToken || themeWriteInProgress) return;
    try {
      const remote = await themeApiRequest('/v1/theme', { token: websiteSessionToken });
      const updatedAt = Number(remote.updatedAt) || 0;
      const remoteDiffers = remote.id !== currentSiteTheme || remote.accent !== currentSiteAccent;
      if (updatedAt >= lastWebsiteThemeUpdatedAt && (updatedAt > lastWebsiteThemeUpdatedAt || remoteDiffers)) {
        applySiteTheme(remote.id, remote.accent, true);
        showThemeSyncStatus('Тема обновлена из WinOptimizer.');
      }
      lastWebsiteThemeUpdatedAt = Math.max(lastWebsiteThemeUpdatedAt, updatedAt);
    } catch (error) {
      if (!handleExpiredWebsiteSession(error))
        showThemeSyncStatus('Не удалось проверить тему приложения: ' + error.message);
    }
  };

  if (siteThemeSelect && siteAccentSelect) {
    const savedTheme = safeStorageGet(SITE_THEME_KEY);
    const savedAccent = safeStorageGet(SITE_ACCENT_KEY);
    applySiteTheme(
      Object.prototype.hasOwnProperty.call(siteThemes, savedTheme) ? savedTheme : 'dark',
      Object.prototype.hasOwnProperty.call(siteAccents, savedAccent) ? savedAccent : 'theme',
      false
    );
    siteThemeSelect.addEventListener('change', () => {
      applySiteTheme(siteThemeSelect.value, currentSiteAccent);
      void pushWebsiteTheme();
    });
    siteAccentSelect.addEventListener('change', () => {
      applySiteTheme(currentSiteTheme, siteAccentSelect.value);
      void pushWebsiteTheme();
    });
  }

  if (themePairForm && themePairCode) {
    themePairForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const code = themePairCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) {
        showThemeSyncStatus('Проверьте код: он должен состоять из 8 символов.');
        themePairCode.focus();
        return;
      }

      if (themePairSubmit) themePairSubmit.disabled = true;
      showThemeSyncStatus('Подтверждаем привязку устройства…');
      try {
        const result = await themeApiRequest('/v1/pairings/claim', {
          method: 'POST',
          body: { code, theme: { id: currentSiteTheme, accent: currentSiteAccent } }
        });
        if (!result.webToken) throw new Error('Сервер не вернул веб-токен сессии.');
        websiteSessionToken = result.webToken;
        if (!safeStorageSet(SITE_SESSION_KEY, websiteSessionToken)) {
          showThemeSyncStatus('Привязка выполнена, но браузер запретил сохранение сессии. Не закрывайте вкладку.');
        } else {
          showThemeSyncStatus('Устройство привязано. Тема будет синхронизироваться в течение веб-сессии.');
        }
        lastWebsiteThemeUpdatedAt = 0;
        setThemeConnectionUi(true);
        themePairCode.value = '';
        await pullWebsiteTheme();
      } catch (error) {
        showThemeSyncStatus('Не удалось привязать устройство: ' + error.message);
      } finally {
        if (themePairSubmit) themePairSubmit.disabled = false;
      }
    });
  }

  if (themeSyncForget) {
    themeSyncForget.addEventListener('click', () => {
      forgetWebsiteSession();
      showThemeSyncStatus('Сессия удалена из этого браузера. Приложение при этом остаётся привязанным.');
    });
  }

  const savedWebToken = safeStorageGet(SITE_SESSION_KEY);
  if (savedWebToken) {
    websiteSessionToken = savedWebToken;
    setThemeConnectionUi(true);
    showThemeSyncStatus('Проверяем сохранённую связь с приложением…');
    void pullWebsiteTheme();
    window.setInterval(() => { void pullWebsiteTheme(); }, 20000);
  }

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('visible'));
  }

  document.querySelectorAll('.hero .reveal').forEach((el, i) => {
    setTimeout(() => el.classList.add('visible'), 80 + i * 120);
  });
})();
