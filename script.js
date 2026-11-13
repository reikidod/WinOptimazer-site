(function () {
  const header = document.getElementById('header');
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('nav');

  // Resolve the newest published installer, including prereleases.
  const resolveLatestInstaller = async () => {
    const links = document.querySelectorAll('[data-download-latest]');
    if (!links.length) return;

    const releasesUrl = 'https://github.com/reikidod/WinOptimazer/releases';
    const channelLabels = document.querySelectorAll('[data-release-channel]');
    const versionLabels = document.querySelectorAll('[data-release-version]');
    const dateLabels = document.querySelectorAll('[data-release-date]');

    // Keep a useful fallback if the GitHub API is unavailable or rate-limited.
    links.forEach((link) => { link.href = releasesUrl; });

    try {
      const response = await fetch('https://api.github.com/repos/reikidod/WinOptimazer/releases?per_page=10', {
        headers: { Accept: 'application/vnd.github+json' },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`GitHub Releases API: ${response.status}`);

      const releases = await response.json();
      const release = releases.find((item) =>
        !item.draft && (item.assets || []).some((asset) =>
          asset.name === 'WinOptimizer-Setup.exe' && asset.state === 'uploaded'
        )
      );
      if (!release) throw new Error('No published installer release found');

      const installer = release.assets.find((asset) =>
        asset.name === 'WinOptimizer-Setup.exe' && asset.state === 'uploaded'
      );
      links.forEach((link) => {
        link.href = installer.browser_download_url;
        link.removeAttribute('target');
        link.removeAttribute('rel');
      });

      const channel = release.prerelease ? 'Beta' : 'Stable';
      const version = release.tag_name || release.name || 'последняя версия';
      const date = release.published_at
        ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
            .format(new Date(release.published_at))
        : '';

      channelLabels.forEach((label) => { label.textContent = channel; });
      versionLabels.forEach((label) => { label.textContent = version; });
      dateLabels.forEach((label) => { label.textContent = date ? ` · ${date}` : ''; });
    } catch (error) {
      channelLabels.forEach((label) => { label.textContent = 'Релизы'; });
      versionLabels.forEach((label) => { label.textContent = 'Выберите версию на GitHub'; });
      dateLabels.forEach((label) => { label.textContent = ''; });
      console.warn('Не удалось определить последний установщик WinOptimizer:', error);
    }
  };
  resolveLatestInstaller();

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 12);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toggle?.addEventListener('click', () => {
    nav?.classList.toggle('open');
    toggle.classList.toggle('open');
  });

  nav?.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle?.classList.remove('open');
    });
  });

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
