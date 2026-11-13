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
