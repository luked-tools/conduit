// Basic modal helpers extracted from main.js

function openBasicModal({ title = '', body = '', buttons = [] } = {}) {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const btnsEl = document.getElementById('modal-btns');
  if (!overlay || !titleEl || !bodyEl || !btnsEl) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = body;
  btnsEl.innerHTML = '';

  buttons.forEach(btn => {
    const b = document.createElement('button');
    b.className = btn.className || 'tb-btn';
    b.textContent = btn.label || 'OK';
    b.onclick = () => {
      if (btn.closeFirst !== false) closeBasicModal();
      if (typeof btn.onClick === 'function') btn.onClick();
    };
    btnsEl.appendChild(b);
  });

  overlay.classList.add('open');
}

function closeBasicModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
}
