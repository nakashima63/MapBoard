// 選択中のスポット候補
let _selectedSpot = null;
// 表示中のスポット一覧（フィルタリング用）
let _allSpots = {};

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', async () => {
  _setupModal();
  _setupSearch();
  _setupFilter();
  await _loadSpots();
});

// ===== スポット一覧の読み込みと描画 =====
async function _loadSpots() {
  const grid = document.getElementById('spot-grid');
  grid.innerHTML = '<div class="loading">読み込み中...</div>';

  try {
    _allSpots = await StorageModule.getSpots();
    _renderGrid(_allSpots);
    _updateCategoryFilter(_allSpots);
  } catch (e) {
    console.error('スポットの読み込みエラー:', e);
    grid.innerHTML = '<p class="empty-state">スポットの読み込みに失敗しました</p>';
  }
}

function _renderGrid(spots) {
  const grid = document.getElementById('spot-grid');
  const list = Object.values(spots);

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📍</div>
        <p class="empty-state__text">スポットがまだありません<br>「＋ スポットを追加」から登録してください</p>
      </div>`;
    return;
  }

  grid.innerHTML = list.map(_buildCardHtml).join('');
}

function _buildCardHtml(spot) {
  const badge = spot.visited
    ? '<span class="badge badge--visited">訪問済み</span>'
    : '<span class="badge badge--unvisited">未訪問</span>';
  const category = spot.category
    ? `<span class="card__category">${_escape(spot.category)}</span>`
    : '';
  const memo = spot.memo
    ? `<p class="card__memo">${_escape(spot.memo)}</p>`
    : '';

  return `
    <a class="card" href="detail.html?id=${encodeURIComponent(spot.place_id)}">
      <div class="card__header">
        <span class="card__name">${_escape(spot.name)}</span>
        ${category}
      </div>
      ${memo}
      <div class="card__footer">
        ${badge}
        <span class="card__date">${spot.saved_at || ''}</span>
      </div>
    </a>`;
}

// ===== カテゴリフィルター =====
function _updateCategoryFilter(spots) {
  const select = document.getElementById('filter-category');
  const current = select.value;
  const categories = [...new Set(Object.values(spots).map(s => s.category).filter(Boolean))].sort();

  select.innerHTML = '<option value="">すべてのカテゴリ</option>' +
    categories.map(c => `<option value="${_escape(c)}">${_escape(c)}</option>`).join('');
  select.value = current;

  // datalist（追加モーダル用）を更新
  const datalist = document.getElementById('category-list');
  if (datalist) {
    datalist.innerHTML = categories.map(c => `<option value="${_escape(c)}">`).join('');
  }
}

function _setupFilter() {
  const filterInput = document.getElementById('filter-input');
  const filterCategory = document.getElementById('filter-category');

  const applyFilter = () => {
    const keyword = filterInput.value.trim().toLowerCase();
    const category = filterCategory.value;

    const filtered = Object.fromEntries(
      Object.entries(_allSpots).filter(([, spot]) => {
        const matchKeyword = !keyword ||
          spot.name.toLowerCase().includes(keyword) ||
          (spot.memo || '').toLowerCase().includes(keyword);
        const matchCategory = !category || spot.category === category;
        return matchKeyword && matchCategory;
      })
    );
    _renderGrid(filtered);
  };

  filterInput.addEventListener('input', applyFilter);
  filterCategory.addEventListener('change', applyFilter);
}

// ===== モーダル =====
function _setupModal() {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('btn-add-spot').addEventListener('click', () => _openModal());
  document.getElementById('modal-close').addEventListener('click', () => _closeModal());
  document.getElementById('btn-cancel').addEventListener('click', () => _closeModal());
  document.getElementById('btn-save-spot').addEventListener('click', _saveSpot);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) _closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) _closeModal();
  });
}

function _openModal() {
  _resetModal();
  document.getElementById('modal-overlay').hidden = false;
  document.getElementById('search-input').focus();
}

function _closeModal() {
  document.getElementById('modal-overlay').hidden = true;
  _resetModal();
}

function _resetModal() {
  _selectedSpot = null;
  document.getElementById('search-input').value = '';
  document.getElementById('category-input').value = '';
  document.getElementById('search-results').innerHTML = '';
  document.getElementById('search-results').classList.remove('is-open');
  document.getElementById('selected-spot-info').hidden = true;
  document.getElementById('btn-save-spot').disabled = true;
}

// ===== Places API 検索 =====
function _setupSearch() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  let timer = null;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const query = input.value.trim();
    if (query.length < 2) {
      results.classList.remove('is-open');
      results.innerHTML = '';
      return;
    }
    timer = setTimeout(() => _doSearch(query), 400);
  });

  // 候補リスト外クリックで閉じる
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-dropdown')) {
      results.classList.remove('is-open');
    }
  });
}

async function _doSearch(query) {
  const results = document.getElementById('search-results');
  results.innerHTML = '<li class="search-result-item">検索中...</li>';
  results.classList.add('is-open');

  try {
    const spots = await PlacesModule.search(query);

    if (spots.length === 0) {
      results.innerHTML = '<li class="search-result-item">候補が見つかりませんでした</li>';
      return;
    }

    results.innerHTML = spots.map((spot, i) => `
      <li class="search-result-item" role="option" data-index="${i}"
          data-place-id="${_escape(spot.place_id)}"
          data-name="${_escape(spot.name)}"
          data-address="${_escape(spot.address)}">
        <span class="search-result-item__name">${_escape(spot.name)}</span>
        <span class="search-result-item__address">${_escape(spot.address)}</span>
      </li>`).join('');

    results.querySelectorAll('.search-result-item[data-place-id]').forEach(el => {
      el.addEventListener('click', () => _selectSpot({
        place_id: el.dataset.placeId,
        name: el.dataset.name,
        address: el.dataset.address
      }));
    });
  } catch (e) {
    console.error('検索エラー:', e);
    results.innerHTML = '<li class="search-result-item">検索に失敗しました</li>';
  }
}

function _selectSpot(spot) {
  _selectedSpot = spot;

  document.getElementById('search-input').value = spot.name;
  document.getElementById('search-results').classList.remove('is-open');
  document.getElementById('selected-name').textContent = spot.name;
  document.getElementById('selected-address').textContent = spot.address;
  document.getElementById('selected-spot-info').hidden = false;
  document.getElementById('btn-save-spot').disabled = false;
  document.getElementById('category-input').focus();
}

// ===== スポット保存 =====
async function _saveSpot() {
  if (!_selectedSpot) return;

  // 重複チェック
  if (_allSpots[_selectedSpot.place_id]) {
    _showToast('このスポットはすでに登録されています');
    return;
  }

  const category = document.getElementById('category-input').value.trim();
  const spot = {
    place_id: _selectedSpot.place_id,
    name: _selectedSpot.name,
    category,
    memo: '',
    visited: false
  };

  const btn = document.getElementById('btn-save-spot');
  btn.disabled = true;
  btn.textContent = '保存中...';

  try {
    await StorageModule.saveSpot(spot);
    _allSpots[spot.place_id] = { ...spot, saved_at: new Date().toISOString().slice(0, 10) };
    _closeModal();
    _renderGrid(_allSpots);
    _updateCategoryFilter(_allSpots);
    _showToast(`「${spot.name}」を登録しました`);
  } catch (e) {
    console.error('保存エラー:', e);
    _showToast('保存に失敗しました');
    btn.disabled = false;
    btn.textContent = '保存する';
  }
}

// ===== トースト通知 =====
function _showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  setTimeout(() => toast.classList.remove('is-visible'), 3000);
}

// ===== ユーティリティ =====
function _escape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
