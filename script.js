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
