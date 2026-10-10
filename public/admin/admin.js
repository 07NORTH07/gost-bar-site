// Адмінка меню: додавання/редагування товарів і фото.
// Фото стискається й обрізається прямо в браузері (канвас) — на сервер летить готовий JPEG 4:3.
const $ = (id) => document.getElementById(id);
const TOKEN_KEY = 'gostbar_admin_token';

const FULL = { w: 1200, h: 900, q: 0.86 };
const THUMB = { w: 600, h: 450, q: 0.82 };
const MAX_FILE_MB = 15;

const state = {
  token: null,
  categories: [],
  products: [],
  editingId: null,
  bitmap: null, // нове фото, обране користувачем
  existingUrl: '', // фото, яке вже збережене в товарі
  removeImage: false,
};

try { state.token = sessionStorage.getItem(TOKEN_KEY); } catch { /* приватний режим */ }

// ---------- Утиліти ----------
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  // лапки теж: значення потрапляють в атрибути (src="…", value="…")
  return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

let toastTimer;
function toast(text, isError = false) {
  const el = $('toast');
  el.textContent = text;
  el.classList.toggle('is-error', isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api/admin${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/login') {
    showLogin();
    throw new Error('Сесія завершилась, увійдіть знову');
  }
  if (!res.ok) throw new Error(data.error || 'Помилка сервера');
  return data;
}

// ---------- Вхід / вихід ----------
function showLogin() {
  state.token = null;
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ігноруємо */ }
  $('appView').hidden = true;
  $('loginView').hidden = false;
  $('loginPassword').value = '';
  $('loginPassword').focus();
}

async function showApp() {
  $('loginView').hidden = true;
  $('appView').hidden = false;
  await Promise.all([loadCategories(), loadProducts()]);
  resetForm();
}

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('loginError').hidden = true;
  try {
    const { token } = await api('/login', { method: 'POST', body: { password: $('loginPassword').value } });
    state.token = token;
    try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* ігноруємо */ }
    await showApp();
  } catch (err) {
    $('loginError').textContent = err.message;
    $('loginError').hidden = false;
  }
});
$('logoutBtn').addEventListener('click', showLogin);

// ---------- Дані ----------
async function loadCategories() {
  state.categories = await api('/categories');
  renderCategorySelect();
}

async function loadProducts() {
  state.products = await api('/products');
  renderList();
}

function renderCategorySelect(selectedId) {
  const sel = $('fCategory');
  const keep = selectedId ?? sel.value;
  const groups = { kitchen: 'Кухня', bar: 'Бар' };
  sel.innerHTML = Object.entries(groups)
    .map(([section, title]) => {
      const opts = state.categories
        .filter((c) => c.section === section)
        .map((c) => `<option value="${c.id}">${esc(c.name)}</option>`)
        .join('');
      return `<optgroup label="${title}">${opts}</optgroup>`;
    })
    .join('');
  if (keep) sel.value = String(keep);
}

// ---------- Список ----------
function renderList() {
  const q = $('listSearch').value.trim().toLowerCase();
  const items = state.products.filter((p) => !q || p.name.toLowerCase().includes(q));
  $('countLabel').textContent = `(${items.length})`;

  if (items.length === 0) {
    $('productList').innerHTML = '<p class="empty">Нічого не знайдено</p>';
    return;
  }

  const groups = new Map();
  for (const p of items) {
    const key = `${p.section === 'bar' ? 'Бар' : 'Кухня'} · ${p.categoryName}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  let html = '';
  for (const [title, list] of groups) {
    html += `<h3 class="group-title">${esc(title)}</h3>`;
    html += list.map(productRow).join('');
  }
  $('productList').innerHTML = html;
}

function thumbUrl(url) {
  return url ? url.replace(/\.jpg$/, '-sm.jpg') : '';
}

function productRow(p) {
  const thumb = p.imageUrl
    ? `<img src="${esc(thumbUrl(p.imageUrl))}" alt="" loading="lazy" />`
    : esc(p.name.charAt(0));
  const badges =
    (p.isNew ? '<span class="badge badge--new">New</span>' : '') +
    (p.isSpicy ? '<span class="badge badge--spicy">Hot</span>' : '') +
    (p.inStock ? '' : '<span class="badge badge--off">Немає</span>');
  return `
    <div class="item${p.inStock ? '' : ' is-off'}${badges ? ' item--badged' : ''}" data-id="${p.id}">
      <div class="item__thumb">${thumb}</div>
      <div class="item__main">
        <div class="item__name">${badges ? `<span class="item__badges">${badges}</span>` : ''}${esc(p.name)}</div>
        <div class="item__meta"><span class="item__price">${p.price} ₴</span>${p.unit ? ` · ${esc(p.unit)}` : ''}</div>
      </div>
      <div class="item__actions">
        <button class="btn btn--ghost btn--sm" data-act="edit" type="button">Редагувати</button>
        <button class="btn btn--ghost btn--sm" data-act="stock" type="button">${p.inStock ? 'Сховати' : 'Повернути'}</button>
        <button class="btn btn--ghost btn--sm btn--danger" data-act="delete" type="button">Видалити</button>
      </div>
    </div>`;
}

$('listSearch').addEventListener('input', renderList);

$('productList').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = Number(btn.closest('.item').dataset.id);
  const product = state.products.find((p) => p.id === id);
  if (!product) return;

  try {
    if (btn.dataset.act === 'edit') {
      startEdit(product);
    } else if (btn.dataset.act === 'stock') {
      await api(`/products/${id}`, { method: 'PUT', body: { ...product, inStock: !product.inStock } });
      toast(product.inStock ? 'Товар сховано з замовлень' : 'Товар повернуто в наявність');
      await loadProducts();
    } else if (btn.dataset.act === 'delete') {
      if (!confirm(`Видалити «${product.name}» назавжди?`)) return;
      await api(`/products/${id}`, { method: 'DELETE' });
      if (state.editingId === id) resetForm();
      toast('Товар видалено');
      await loadProducts();
    }
  } catch (err) {
    toast(err.message, true);
  }
});

// ---------- Фото: обрізка 4:3 + стиснення ----------
const photoCanvas = $('photoCanvas');

function drawCover(ctx, source, sw, sh, w, h, fx, fy) {
  const target = w / h;
  let cw, ch;
  if (sw / sh > target) { ch = sh; cw = sh * target; } else { cw = sw; ch = sw / target; }
  const sx = (sw - cw) * fx;
  const sy = (sh - ch) * fy;
  ctx.fillStyle = '#1B1A17'; // підкладка для прозорих PNG
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, sx, sy, cw, ch, 0, 0, w, h);
}

function focus() {
  return [Number($('focusX').value) / 100, Number($('focusY').value) / 100];
}

function drawPreview() {
  const ctx = photoCanvas.getContext('2d');
  const [fx, fy] = focus();
  if (state.bitmap) {
    drawCover(ctx, state.bitmap, state.bitmap.width, state.bitmap.height, photoCanvas.width, photoCanvas.height, fx, fy);
  }
  const has = Boolean(state.bitmap || (state.existingUrl && !state.removeImage));
  $('photoPreview').classList.toggle('is-empty', !has);
  $('photoRemove').hidden = !has;
  $('photoFocus').hidden = !state.bitmap;
}

function showExistingImage(url) {
  const img = new Image();
  img.onload = () => {
    drawCover(photoCanvas.getContext('2d'), img, img.naturalWidth, img.naturalHeight, photoCanvas.width, photoCanvas.height, 0.5, 0.5);
    drawPreview();
  };
  img.src = url;
}

$('photoInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (file.size > MAX_FILE_MB * 1024 * 1024) return toast(`Фото завелике (максимум ${MAX_FILE_MB} МБ)`, true);
  try {
    // from-image: враховує поворот з EXIF, інакше фото з iPhone може вийти боком
    state.bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    state.removeImage = false;
    $('focusX').value = 50;
    $('focusY').value = 50;
    drawPreview();
  } catch {
    toast('Не вдалося прочитати фото. Спробуйте JPEG або PNG.', true);
  }
});

$('focusX').addEventListener('input', drawPreview);
$('focusY').addEventListener('input', drawPreview);

$('photoRemove').addEventListener('click', () => {
  state.bitmap = null;
  state.removeImage = true;
  photoCanvas.getContext('2d').clearRect(0, 0, photoCanvas.width, photoCanvas.height);
  drawPreview();
});

function renderJpeg({ w, h, q }) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const [fx, fy] = focus();
  drawCover(c.getContext('2d'), state.bitmap, state.bitmap.width, state.bitmap.height, w, h, fx, fy);
  return c.toDataURL('image/jpeg', q);
}

// ---------- Форма ----------
function resetForm() {
  state.editingId = null;
  state.bitmap = null;
  state.existingUrl = '';
  state.removeImage = false;
  $('productForm').reset();
  $('fStock').checked = true;
  $('formTitle').textContent = 'Новий товар';
  $('saveBtn').textContent = 'Додати товар';
  $('cancelEditBtn').hidden = true;
  $('formError').hidden = true;
  photoCanvas.getContext('2d').clearRect(0, 0, photoCanvas.width, photoCanvas.height);
  drawPreview();
}

function startEdit(p) {
  resetForm();
  state.editingId = p.id;
  state.existingUrl = p.imageUrl || '';
  renderCategorySelect(p.categoryId);
  $('fCategory').value = String(p.categoryId);
  $('fName').value = p.name;
  $('fPrice').value = p.price;
  $('fUnit').value = p.unit;
  $('fDesc').value = p.description;
  $('fNew').checked = p.isNew;
  $('fSpicy').checked = p.isSpicy;
  $('fStock').checked = p.inStock;
  $('formTitle').textContent = `Редагування: ${p.name}`;
  $('saveBtn').textContent = 'Зберегти зміни';
  $('cancelEditBtn').hidden = false;
  if (state.existingUrl) showExistingImage(state.existingUrl);
  else drawPreview();
  $('formPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('cancelEditBtn').addEventListener('click', resetForm);

$('newCategoryBtn').addEventListener('click', () => {
  $('newCategoryBox').hidden = !$('newCategoryBox').hidden;
  if (!$('newCategoryBox').hidden) $('ncName').focus();
});

$('ncSave').addEventListener('click', async () => {
  try {
    const cat = await api('/categories', {
      method: 'POST',
      body: { section: $('ncSection').value, name: $('ncName').value },
    });
    await loadCategories();
    $('fCategory').value = String(cat.id);
    $('ncName').value = '';
    $('newCategoryBox').hidden = true;
    toast('Категорію додано');
  } catch (err) {
    toast(err.message, true);
  }
});

function showFormError(msg) {
  $('formError').textContent = msg;
  $('formError').hidden = false;
}

$('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('formError').hidden = true;

  const price = Number($('fPrice').value.replace(/\s/g, ''));
  if (!$('fName').value.trim()) return showFormError('Вкажіть назву товару');
  if (!Number.isInteger(price) || price < 1) return showFormError('Ціна має бути цілим числом, наприклад 110');

  const body = {
    categoryId: Number($('fCategory').value),
    name: $('fName').value,
    description: $('fDesc').value,
    unit: $('fUnit').value,
    price,
    isNew: $('fNew').checked,
    isSpicy: $('fSpicy').checked,
    inStock: $('fStock').checked,
  };
  if (state.bitmap) body.image = { full: renderJpeg(FULL), thumb: renderJpeg(THUMB) };
  else if (state.removeImage) body.removeImage = true;

  $('saveBtn').disabled = true;
  try {
    const editing = state.editingId;
    await api(editing ? `/products/${editing}` : '/products', { method: editing ? 'PUT' : 'POST', body });
    toast(editing ? 'Зміни збережено' : 'Товар додано');
    await loadProducts();
    resetForm();
  } catch (err) {
    showFormError(err.message);
  } finally {
    $('saveBtn').disabled = false;
  }
});

// ---------- Старт ----------
if (state.token) {
  showApp().catch(() => showLogin());
} else {
  showLogin();
}
