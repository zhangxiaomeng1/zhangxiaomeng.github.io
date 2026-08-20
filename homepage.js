(() => {
  const copyStatusTimers = new WeakMap();

  function showCopyStatus(status, message) {
    if (!status) return;
    status.textContent = message;
    window.clearTimeout(copyStatusTimers.get(status));
    copyStatusTimers.set(status, window.setTimeout(() => {
      status.textContent = '';
    }, 2200));
  }

  function copyFallback(value) {
    const input = document.createElement('textarea');
    input.value = value;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.append(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    if (!copied) throw new Error('Copy command failed');
  }

  document.querySelectorAll('[data-copy-text]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.dataset.copyText;
      const status = document.getElementById(button.getAttribute('aria-describedby'));

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
        } else {
          copyFallback(value);
        }
        showCopyStatus(status, '已复制');
      } catch {
        showCopyStatus(status, `微信号：${value}`);
      }
    });
  });

  const sectionLinks = [...document.querySelectorAll('.nav a[href^="#"]')];
  const sections = sectionLinks
    .map((link) => document.getElementById(link.hash.slice(1)))
    .filter(Boolean);

  function setActiveSection(id) {
    sectionLinks.forEach((link) => {
      const isActive = link.hash === `#${id}`;
      if (isActive) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  if ('IntersectionObserver' in window && sections.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      const visibleSection = entries.find((entry) => entry.isIntersecting);
      if (visibleSection) setActiveSection(visibleSection.target.id);
    }, { rootMargin: '-18% 0px -68% 0px', threshold: 0 });

    sections.forEach((section) => observer.observe(section));
  }
})();
