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
