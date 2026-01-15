(() => {
  const modal = document.querySelector('[data-confirm-modal]');
  if (!modal) return;

  const titleEl = modal.querySelector('[data-confirm-title]');
  const msgEl = modal.querySelector('[data-confirm-message]');
  const btnCancel = modal.querySelector('[data-confirm-cancel]');
  const btnOk = modal.querySelector('[data-confirm-ok]');

  let pendingForm = null;
  let bypassOnce = false;

  function openModal({ title, message, okText, cancelText }) {
    titleEl.textContent = title || 'Confirmació';
    msgEl.textContent = message || 'Segur que vols continuar?';
    btnOk.textContent = okText || 'Acceptar';
    btnCancel.textContent = cancelText || 'Cancel·lar';

    modal.classList.add('is-open');
    setTimeout(() => btnCancel.focus(), 0);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    pendingForm = null;
  }

  // Click fora
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });

  btnCancel.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal();
  });

  btnOk.addEventListener('click', (e) => {
    e.preventDefault();
    if (!pendingForm) return;

    bypassOnce = true;
    const form = pendingForm;
    closeModal();
    form.submit();            // submit real
  });

  // Intercepció GLOBAL del submit (capture)
  document.addEventListener(
    'submit',
    (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;

      // deixa passar el submit programàtic
      if (bypassOnce) {
        bypassOnce = false;
        return;
      }

      if (form.dataset.confirm !== 'true') return;

      // Si el form té checkboxes, obliguem que n'hi hagi alguna marcada.
      // Si NO en té (com els forms petits de "remove member/owner"), mostrem el modal igual.
      const totalCheckboxes = form.querySelectorAll('input[type="checkbox"]').length;
      const checked = form.querySelectorAll('input[type="checkbox"]:checked').length;

      if (totalCheckboxes > 0 && checked === 0) return;


      e.preventDefault();

      pendingForm = form;

      openModal({
        title: form.dataset.confirmTitle,
        message: form.dataset.confirmMessage,
        okText: form.dataset.confirmOk,
        cancelText: form.dataset.confirmCancel,
      });
    },
    true
  );
})();
