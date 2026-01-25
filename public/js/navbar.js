(function () {
  const btn = document.getElementById('userMenuBtn');
  const dd = document.getElementById('userDropdown');
  if (!btn || !dd) return;

  function open() { dd.style.display = 'block'; btn.setAttribute('aria-expanded', 'true'); }
  function close() { dd.style.display = 'none'; btn.setAttribute('aria-expanded', 'false'); }

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const isOpen = dd.style.display === 'block';
    if (isOpen) close(); else open();
  });

  document.addEventListener('click', (e) => {
    if (btn.contains(e.target) || dd.contains(e.target)) return;
    close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  const logoutBtn = document.getElementById('logoutBtn');
  const logoutForm = document.getElementById('logoutForm');

  if (logoutBtn && logoutForm) {
    logoutBtn.addEventListener('click', () => {
      close();
      logoutForm.requestSubmit ? logoutForm.requestSubmit() : logoutForm.submit();
    });
  }
})();
