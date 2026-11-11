(function () {
  const header = document.getElementById('header');
  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('nav');

  // Sticky header shadow
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 12);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
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

  // Scroll reveal
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
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('visible'));
  }

  // Hero appears immediately
  document.querySelectorAll('.hero .reveal').forEach((el) => {
    requestAnimationFrame(() => el.classList.add('visible'));
  });
})();
