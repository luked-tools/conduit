function createAppMenu({ className = '' } = {}) {
  const menu = document.createElement('div');
  menu.className = ['app-menu', className].filter(Boolean).join(' ');
  return menu;
}

function createAppMenuLabel(text, className = '') {
  const label = document.createElement('div');
  label.className = ['app-menu-label', className].filter(Boolean).join(' ');
  label.textContent = text;
  return label;
}

function createAppMenuDivider(className = '') {
  const divider = document.createElement('div');
  divider.className = ['app-menu-divider', className].filter(Boolean).join(' ');
  divider.setAttribute('aria-hidden', 'true');
  return divider;
}

function createAppMenuItem({
  label,
  icon = '',
  onClick = () => {},
  disabled = false,
  danger = false,
  primary = false,
  title = '',
  className = ''
} = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = ['app-menu-item', className].filter(Boolean).join(' ')
    + (danger ? ' danger' : '')
    + (primary ? ' primary' : '');
  btn.disabled = !!disabled;
  if (title) btn.title = title;

  const iconSlot = document.createElement('span');
  iconSlot.className = 'app-menu-item-icon';
  iconSlot.innerHTML = icon || '';
  btn.appendChild(iconSlot);

  const labelSlot = document.createElement('span');
  labelSlot.className = 'app-menu-item-label';
  labelSlot.textContent = label;
  btn.appendChild(labelSlot);

  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.disabled) return;
    onClick();
  });

  return btn;
}
