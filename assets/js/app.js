const STORAGE_KEYS = {
  profiles: 'kidprint_profiles',
  currentProfile: 'kidprint_current_profile',
  custom: 'custom_items',
  favorites: 'favorite_items',
  selected: 'selected_items',
  history: 'search_history'
};

let items = [];
let customItems = [];
let favorites = [];
let selectedIds = [];
let searchHistory = [];
let searchResultIds = [];
let favOnly = false;
let profiles = [];
let currentProfile = null;

function initApp() {
  loadProfiles();
  loadState();
  bindEvents();
  window.runAIAssistant = runAIAssistant;
  window.importFromWeb = importFromWeb;
  window.openManualAddModal = openManualAddModal;
  window.toggleFavOnly = toggleFavOnly;
  window.toggleFavorite = toggleFavorite;
  window.toggleSelection = toggleSelection;
  window.printSelectedActivities = printSelectedActivities;
  window.createProfile = createProfile;
  window.changeProfile = changeProfile;
  window.goHome = goHome;
  window.selectDailyActivity = selectDailyActivity;

  renderProfileSelector();
  loadActivities();
}

document.addEventListener('DOMContentLoaded', initApp);

function bindEvents() {
  const queryInput = document.getElementById('aiQuery');
  if (queryInput) {
    queryInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        runAIAssistant();
      }
    });
  }
}

function loadState() {
  try {
    const savedCustom = getProfileValue(STORAGE_KEYS.custom, []);
    const savedFavorites = getProfileValue(STORAGE_KEYS.favorites, []);
    const savedSelected = getProfileValue(STORAGE_KEYS.selected, []);
    const savedHistory = getProfileValue(STORAGE_KEYS.history, []);
    customItems = Array.isArray(savedCustom) ? savedCustom : [];
    favorites = Array.isArray(savedFavorites) ? savedFavorites : [];
    selectedIds = Array.isArray(savedSelected) ? savedSelected : [];
    searchHistory = Array.isArray(savedHistory) ? savedHistory : [];
  } catch (error) {
    customItems = [];
    favorites = [];
    selectedIds = [];
    searchHistory = [];
  }
}

function saveCustomItems() {
  localStorage.setItem(getProfileKey(STORAGE_KEYS.custom), JSON.stringify(customItems));
}

function saveFavorites() {
  localStorage.setItem(getProfileKey(STORAGE_KEYS.favorites), JSON.stringify(favorites));
}

function saveSelectedItems() {
  localStorage.setItem(getProfileKey(STORAGE_KEYS.selected), JSON.stringify(selectedIds));
}

function saveSearchHistory() {
  localStorage.setItem(getProfileKey(STORAGE_KEYS.history), JSON.stringify(searchHistory));
}

function getProfileKey(key) {
  const profileId = currentProfile?.id || 'default';
  return `${profileId}_${key}`;
}

function getProfileValue(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(getProfileKey(key)) || JSON.stringify(fallback));
  } catch (error) {
    return fallback;
  }
}

function saveProfiles() {
  localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles));
}

function createDefaultProfile() {
  const defaultProfile = { id: 'default', name: 'Profil par défaut' };
  profiles = [defaultProfile];
  currentProfile = defaultProfile;
  saveProfiles();
  localStorage.setItem(STORAGE_KEYS.currentProfile, currentProfile.id);
}

function loadProfiles() {
  try {
    const savedProfiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.profiles) || '[]');
    const savedCurrentProfileId = localStorage.getItem(STORAGE_KEYS.currentProfile);
    profiles = Array.isArray(savedProfiles) && savedProfiles.length > 0 ? savedProfiles : [];
    if (profiles.length === 0) {
      createDefaultProfile();
    } else {
      currentProfile = profiles.find((profile) => profile.id === savedCurrentProfileId) || profiles[0];
      if (!savedCurrentProfileId) {
        localStorage.setItem(STORAGE_KEYS.currentProfile, currentProfile.id);
      }
    }
  } catch (error) {
    createDefaultProfile();
  }
}

function setCurrentProfile(profileId) {
  const profile = profiles.find((profile) => profile.id === profileId);
  if (!profile) return;
  currentProfile = profile;
  localStorage.setItem(STORAGE_KEYS.currentProfile, profileId);
  loadState();
  renderProfileSelector();
  renderDailyActivity();
  renderSearchHistory();
  renderGrid();
}

function changeProfile(profileId) {
  setCurrentProfile(profileId);
}

function renderProfileSelector() {
  const container = document.getElementById('profileSelector');
  if (!container) return;
  container.innerHTML = `
    <label for="profileSelect"><strong>Profil :</strong></label>
    <select id="profileSelect" onchange="changeProfile(this.value)">
      ${profiles.map((profile) => `<option value="${profile.id}" ${profile.id === currentProfile?.id ? 'selected' : ''}>${profile.name}</option>`).join('')}
    </select>
    <button class="btn-outline" type="button" onclick="createProfile()">Nouveau profil</button>
  `;
}

function openModal({ title, body, confirmText = 'OK', cancelText = 'Annuler', onConfirm }) {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  if (!overlay || !content) return;

  content.innerHTML = `
    <h2 id="modalTitle">${title}</h2>
    <div class="modal-body">${body}</div>
    <div class="modal-actions">
      <button class="btn" type="button" id="modalConfirm">${confirmText}</button>
      <button class="btn-outline" type="button" id="modalCancel">${cancelText}</button>
    </div>
  `;

  overlay.classList.remove('hidden');
  document.body.classList.add('modal-open');

  const confirmBtn = document.getElementById('modalConfirm');
  const cancelBtn = document.getElementById('modalCancel');

  cancelBtn?.addEventListener('click', closeModal);
  confirmBtn?.addEventListener('click', () => {
    const result = typeof onConfirm === 'function' ? onConfirm() : true;
    if (result !== false) closeModal();
  });
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  if (!overlay || !content) return;
  overlay.classList.add('hidden');
  content.innerHTML = '';
  document.body.classList.remove('modal-open');
}

function openCreateProfileModal() {
  openModal({
    title: 'Nouveau profil',
    body: `
      <label for="newProfileName">Nom du profil</label>
      <input id="newProfileName" type="text" placeholder="Ex. Emma, Lucas" />
    `,
    confirmText: 'Créer',
    cancelText: 'Annuler',
    onConfirm: () => {
      const input = document.getElementById('newProfileName');
      const name = input?.value?.trim();
      if (!name) {
        showResponse('Donne un nom à ton profil.', 'info');
        return false;
      }
      const profile = { id: `profile_${Date.now()}`, name };
      profiles.push(profile);
      saveProfiles();
      setCurrentProfile(profile.id);
    }
  });
}

function createProfile() {
  openCreateProfileModal();
}


function getDailyActivity() {
  if (items.length === 0) return null;
  const seed = new Date().getDate() + new Date().getMonth();
  const index = seed % items.length;
  return items[index];
}

function selectDailyActivity() {
  const daily = getDailyActivity();
  if (!daily) return;
  if (!selectedIds.includes(daily.id)) {
    selectedIds.push(daily.id);
    saveSelectedItems();
  }
  searchResultIds = [daily.id];
  renderGrid();
  showResponse(`Activité du jour sélectionnée : ${daily.title}`, 'success');
}

function renderDailyActivity() {
  const container = document.getElementById('dailyActivity');
  if (!container) return;
  const daily = getDailyActivity();
  if (!daily) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';
  container.innerHTML = `
    <button class="daily-card" type="button" onclick="selectDailyActivity()">
      <div>
        <h3>✨ Activité du jour pour ${currentProfile?.name || 'le profil'}</h3>
        <p><strong>${daily.title}</strong></p>
        <p>${daily.desc || 'Une activité sympa à imprimer avec ton enfant.'}</p>
        <div class="daily-meta">
          <span>${daily.category || 'Activité'}</span>
          <span>${daily.age || 'Tous âges'}</span>
        </div>
      </div>
      <span class="daily-action">Voir</span>
    </button>
  `;
}

function inferDifficulty(query) {
  const normalized = (query || '').toLowerCase();
  if (normalized.includes('3') || normalized.includes('3 ans') || normalized.includes('petit') || normalized.includes('facile')) return 'Facile';
  if (normalized.includes('9') || normalized.includes('10') || normalized.includes('11') || normalized.includes('12') || normalized.includes('9-12') || normalized.includes('avancé') || normalized.includes('difficile')) return 'Avancé';
  return 'Moyen';
}

function inferObjective(query) {
  const normalized = (query || '').toLowerCase();
  if (normalized.includes('coloriage') || normalized.includes('dessin')) return 'Développer la motricité fine et la concentration';
  if (normalized.includes('labyrinthe')) return 'Travailler l’attention et la logique spatiale';
  if (normalized.includes('mot') || normalized.includes('lettre') || normalized.includes('vocabulaire')) return 'Renforcer la reconnaissance des lettres et le vocabulaire';
  if (normalized.includes('math') || normalized.includes('calcul') || normalized.includes('nombre')) return 'Stimuler le calcul mental et la logique';
  return 'Favoriser l’apprentissage ludique et la curiosité';
}

function inferImage(query) {
  const normalized = (query || '').toLowerCase();
  if (normalized.includes('coloriage') || normalized.includes('dessin')) return 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=80';
  if (normalized.includes('labyrinthe')) return 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80';
  if (normalized.includes('mot') || normalized.includes('lettre')) return 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80';
  if (normalized.includes('math') || normalized.includes('calcul')) return 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&w=800&q=80';
  return 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=800&q=80';
}

async function loadActivities() {
  try {
    const response = await fetch('./data/activites.json');
    if (!response.ok) throw new Error('Impossible de charger les activités');
    const data = await response.json();
    items = Array.isArray(data) ? data : [];
  } catch (error) {
    items = [
      {
        id: 1,
        title: 'Labyrinthe Spatial',
        category: 'Labyrinthe',
        age: '6-8',
        icon: '🚀',
        desc: 'Aide l’astronaute à retrouver sa fusée.'
      },
      {
        id: 2,
        title: 'Mots Fléchés Animaux',
        category: 'Mots Fléchés',
        age: '6-8',
        icon: '🦁',
        desc: 'Grille simple pour découvrir les animaux.'
      }
    ];
  }

  items = [...items, ...customItems];
  renderSearchHistory();
  renderDailyActivity();
  renderGrid();
}

function renderGrid() {
  const grid = document.getElementById('contentGrid');
  if (!grid) return;

  let visibleItems = [...items];

  if (searchResultIds.length > 0) {
    visibleItems = visibleItems.filter((item) => searchResultIds.includes(item.id));
  }

  const ageFilter = document.getElementById('ageFilter')?.value || 'all';
  const categoryFilter = document.getElementById('categoryFilter')?.value || 'all';

  if (ageFilter !== 'all') {
    visibleItems = visibleItems.filter((item) => item.age === ageFilter);
  }

  if (categoryFilter !== 'all') {
    visibleItems = visibleItems.filter((item) => item.category === categoryFilter);
  }

  if (favOnly) {
    visibleItems = visibleItems.filter((item) => favorites.includes(item.id));
  }

  if (visibleItems.length === 0) {
    grid.innerHTML = '<div class="empty-state">Aucune activité ne correspond à ce filtre pour l’instant.</div>';
    updateBundleBar();
    return;
  }

  grid.innerHTML = visibleItems.map((item) => buildCardMarkup(item)).join('');
  updateFavoriteCount();
  updateBundleBar();
}

function buildCardMarkup(item) {
  const isFavorite = favorites.includes(item.id);
  const isSelected = selectedIds.includes(item.id);
  const imageMarkup = item.imageUrl
    ? `<img class="card-img" src="${item.imageUrl}" alt="${item.title}" onerror="this.style.display='none'; this.parentElement.innerHTML += '<div class=\'card-img-fallback\'>${item.icon || '🎨'}</div>'">`
    : `<div class="card-img">${item.icon || '🎨'}</div>`;

  return `
    <article class="card ${isSelected ? 'selected-card' : ''}">
      <button class="fav-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite(${item.id})" aria-label="Ajouter aux favoris">${isFavorite ? '❤️' : '🤍'}</button>
      ${imageMarkup}
      <div class="card-body">
        <div>
          <h3>${item.title}</h3>
          <p>${item.desc || 'Activité à imprimer et à découvrir.'}</p>
          ${item.difficulty ? `<p class="meta-line">Niveau : <strong>${item.difficulty}</strong></p>` : ''}
          ${item.objective ? `<p class="meta-line">Objectif : ${item.objective}</p>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn-small ${isSelected ? 'selected' : ''}" onclick="toggleSelection(${item.id})">${isSelected ? '✅ Ajouté' : '➕ Ajouter'}</button>
        </div>
        <div class="card-tags">
          <span class="tag">${item.category || 'Activité'}</span>
          <span class="tag">${item.age || 'Tous âges'}</span>
        </div>
      </div>
    </article>
  `;
}

function toggleFavorite(id) {
  const exists = favorites.includes(id);
  favorites = exists ? favorites.filter((itemId) => itemId !== id) : [...favorites, id];
  saveFavorites();
  renderGrid();
}

function updateFavoriteCount() {
  const favCount = document.getElementById('favCount');
  if (favCount) {
    favCount.textContent = favorites.length;
  }
}

function updateBundleBar() {
  const bar = document.getElementById('bundle-bar');
  if (!bar) return;

  const selectedItems = getSelectedItems();
  if (selectedItems.length === 0) {
    bar.classList.remove('visible');
    bar.innerHTML = '';
    return;
  }

  bar.classList.add('visible');
  bar.innerHTML = `
    <span>${selectedItems.length} activité${selectedItems.length > 1 ? 's' : ''} sélectionnée${selectedItems.length > 1 ? 's' : ''} pour l’impression</span>
    <div class="bundle-actions">
      <button class="btn-bundle" onclick="printSelectedActivities()">🖨️ Imprimer</button>
    </div>
  `;
}

function getSelectedItems() {
  return items.filter((item) => selectedIds.includes(item.id));
}

function toggleSelection(id) {
  const exists = selectedIds.includes(id);
  selectedIds = exists ? selectedIds.filter((itemId) => itemId !== id) : [...selectedIds, id];
  saveSelectedItems();
  renderGrid();
  showResponse(exists ? 'L’activité a été retirée de votre sélection.' : 'L’activité a été ajoutée à votre sélection d’impression.', 'success');
}

function printSelectedActivities() {
  const selectedItems = getSelectedItems();
  if (selectedItems.length === 0) {
    showResponse('Sélectionne au moins une activité pour l’impression.', 'info');
    return;
  }

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    showResponse('La fenêtre d’impression a été bloquée. Autorise les popups puis réessaie.', 'info');
    return;
  }

  const content = selectedItems.map((item) => {
    const imageBlock = item.imageUrl
      ? `<img src="${item.imageUrl}" alt="${item.title}" class="print-image" onerror="this.style.display='none';">`
      : '';

    return `
      <section class="print-card">
        <header>
          <h2>${item.title}</h2>
          <p class="print-category">${item.category || 'Activité'} • ${item.age || 'Tous âges'}</p>
        </header>
        ${imageBlock}
        <p class="print-description">${item.desc || 'Activité à imprimer.'}</p>
        <div class="print-meta">
          ${item.difficulty ? `<span>Niveau : ${item.difficulty}</span>` : ''}
          ${item.objective ? `<span>Objectif : ${item.objective}</span>` : ''}
        </div>
      </section>
    `;
  }).join('');

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Impression KidPrint</title>
  <style>
    @page { size: A4 portrait; margin: 18mm; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #222; background: white; }
    .page { width: 100%; min-height: 100vh; box-sizing: border-box; padding: 16mm 18mm 20mm; display: flex; flex-direction: column; justify-content: flex-start; }
    .page:not(:last-child) { page-break-after: always; }
    .cover { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 0.8rem; }
    .cover h1 { margin: 0; font-size: 42px; color: #2169d2; }
    .cover p { margin: 0; font-size: 18px; color: #444; }
    .activity-card { border: 2px solid #e2e8f0; border-radius: 18px; padding: 18px; margin-top: 12mm; display: flex; flex-direction: column; gap: 14px; }
    .activity-card header { display: flex; flex-direction: column; gap: 8px; }
    .activity-card h2 { margin: 0; font-size: 30px; color: #1f2937; }
    .activity-info { display: flex; flex-wrap: wrap; gap: 10px; font-size: 0.95rem; color: #475569; }
    .activity-info span { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 999px; padding: 8px 12px; }
    .activity-body { display: grid; gap: 12px; }
    .activity-description { font-size: 1rem; line-height: 1.65; color: #334155; }
    .activity-image { width: 100%; max-height: 260px; object-fit: cover; border-radius: 14px; }
    .activity-metadata { display: flex; flex-wrap: wrap; gap: 10px; font-size: 0.95rem; color: #334155; }
    .activity-metadata span { background: #eff6ff; border-radius: 999px; padding: 8px 12px; }
    .page-footer { margin-top: auto; font-size: 0.9rem; color: #64748b; }
    @media print {
      body { margin: 0; }
      .page { padding: 12mm 16mm; }
      .activity-card { border-color: #cbd5e1; }
      .activity-image { max-height: 220px; }
    }
  </style>
</head>
<body>
  <div class="page cover">
    <h1>KidPrint</h1>
    <p>Activités imprimables sélectionnées</p>
    <p>Nombre d’activités : ${selectedItems.length}</p>
  </div>
  ${content}
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}

function toggleFavOnly() {
  favOnly = !favOnly;
  document.body.classList.toggle('fav-only', favOnly);
  renderGrid();
}

function goHome() {
  const queryInput = document.getElementById('aiQuery');
  if (queryInput) queryInput.value = '';

  const ageFilter = document.getElementById('ageFilter');
  const categoryFilter = document.getElementById('categoryFilter');
  if (ageFilter) ageFilter.value = 'all';
  if (categoryFilter) categoryFilter.value = 'all';

  favOnly = false;
  document.body.classList.remove('fav-only');
  searchResultIds = [];
  hideWebResults();
  renderGrid();
  showResponse('Accueil réinitialisé. Commence une nouvelle recherche.', 'success');
}

function showResponse(message, type = 'info') {
  const responseBox = document.getElementById('aiResponse');
  if (!responseBox) return;
  responseBox.style.display = 'block';
  responseBox.className = `status-message ${type}`;
  responseBox.innerHTML = message;
}

function clearSearch() {
  const queryInput = document.getElementById('aiQuery');
  if (queryInput) queryInput.value = '';
  searchResultIds = [];
  hideWebResults();
  renderGrid();
}

async function runAIAssistant() {
  const input = document.getElementById('aiQuery');
  const query = input?.value?.trim();

  if (!query) {
    showResponse('Écris une idée pour que l’IA trouve des activités adaptées à ton enfant.', 'info');
    return;
  }

  showResponse('Recherche en cours…', 'loading');

  try {
    const response = await fetch('/.netlify/functions/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, action: 'search' })
    });

    if (!response.ok) throw new Error('La recherche IA n’a pas répondu correctement.');

    const data = await response.json();
    const results = Array.isArray(data.recommendedActivities) && data.recommendedActivities.length > 0
      ? data.recommendedActivities
      : localSearch(query);

    const actualResults = [
      ...results,
      ...(Array.isArray(data.webActivities) ? data.webActivities : []),
      ...(data.createdActivity ? [data.createdActivity] : [])
    ];

    actualResults.forEach((activity) => {
      addCustomActivity(activity);
    });

    if (Array.isArray(data.webResults) && data.webResults.length > 0 && actualResults.length === 0) {
      showWebResults(data.webResults);
    } else {
      hideWebResults();
    }

    const uniqueItemIds = Array.from(new Set(actualResults.map((item) => item.id)));
    searchResultIds = uniqueItemIds;

    addSearchHistory(query);
    if (searchResultIds.length === 0) {
      searchResultIds = [];
    }

    if (actualResults.length > 0) {
      showResponse(`J’ai trouvé ${actualResults.length} activité(s) adaptée(s) à votre demande.`, 'success');
    } else {
      showResponse('Aucune activité n’a été trouvée avec cette demande. Tu peux ajouter une activité manuellement.', 'info');
    }

    renderGrid();
  } catch (error) {
    const fallbackResults = localSearch(query);
    fallbackResults.forEach((activity) => addCustomActivity(activity));
    searchResultIds = fallbackResults.map((item) => item.id);
    showResponse(`Recherche locale utilisée : ${fallbackResults.length} activité(s) correspondante(s).`, 'success');
    hideWebResults();
    renderGrid();
  }
}

function showWebResults(results) {
  const container = document.getElementById('webResults');
  if (!container) return;
  container.innerHTML = `
    <h3>🔎 Ressources web suggérées</h3>
    <div class="web-results-grid">
      ${results.map((item) => `
        <div class="web-card">
          <div>
            <h4>${item.title}</h4>
            <p>${item.snippet}</p>
          </div>
          <a href="${item.url}" target="_blank" rel="noopener noreferrer">Voir la ressource</a>
        </div>
      `).join('')}
    </div>
  `;
  container.style.display = 'block';
}

function addSearchHistory(query) {
  const normalized = query.trim();
  if (!normalized) return;

  searchHistory = [normalized, ...searchHistory.filter((item) => item !== normalized)].slice(0, 6);
  saveSearchHistory();
  renderSearchHistory();
}

function renderSearchHistory() {
  const container = document.getElementById('searchHistory');
  if (!container) return;

  if (searchHistory.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `<div class="history-label">Recherches récentes :</div>${searchHistory.map((item) => `<button class="history-chip" onclick="runHistorySearch('${item.replace(/'/g, "\\'")}')">${item}</button>`).join('')}`;
}

function runHistorySearch(query) {
  const input = document.getElementById('aiQuery');
  if (input) input.value = query;
  runAIAssistant();
}

function randomSuggestion() {
  const suggestions = [
    'Coloriage pour enfant de 5 ans',
    'Labyrinthe facile pour maternelle',
    'PDF jeu de lettres pour CP',
    'Activité créative à imprimer pour 8 ans',
    'Puzzle logique PDF pour enfant'
  ];
  const choice = suggestions[Math.floor(Math.random() * suggestions.length)];
  const input = document.getElementById('aiQuery');
  if (input) {
    input.value = choice;
    runAIAssistant();
  }
}

function hideWebResults() {
  const container = document.getElementById('webResults');
  if (container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }
}

async function importFromWeb() {
  const input = document.getElementById('importUrlInput');
  const query = input?.value?.trim();

  if (!query) {
    showResponse('Coller une URL ou décrire une activité à importer.', 'info');
    return;
  }

  showResponse('Analyse en cours…', 'loading');

  try {
    const response = await fetch('/.netlify/functions/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, action: 'import_url' })
    });

    if (!response.ok) throw new Error('Import impossible.');

    const data = await response.json();
    if (data.createdActivity) {
      addCustomActivity(data.createdActivity);
      searchResultIds = [data.createdActivity.id];
      renderGrid();
    }

    showResponse(data.message || 'L’activité a bien été préparée.', 'success');
  } catch (error) {
    const createdActivity = createFallbackActivity(query, 'import');
    addCustomActivity(createdActivity);
    searchResultIds = [createdActivity.id];
    renderGrid();
    showResponse('Une activité de secours a été ajoutée à votre liste.', 'success');
  }
}

function addCustomActivity(item) {
  if (!item || !item.title) return;
  const exists = items.some((existing) => existing.id === item.id);
  if (!exists) {
    items.push(item);
  }
  const customExists = customItems.some((existing) => existing.id === item.id);
  if (!customExists) {
    customItems.push(item);
    saveCustomItems();
  }
}

function addSuggestedActivity(item) {
  if (!item || !item.title) return;
  addCustomActivity(item);
  toggleSelection(item.id);
}

function localSearch(query) {
  const normalizedQuery = query.toLowerCase();
  const scored = items
    .map((item) => {
      const haystack = `${item.title} ${item.category} ${item.desc} ${item.age}`.toLowerCase();
      let score = 0;

      if (haystack.includes(normalizedQuery)) score += 8;
      if (normalizedQuery.includes('coloriage') || normalizedQuery.includes('dessin')) {
        if (haystack.includes('coloriage') || haystack.includes('dessin')) score += 6;
      }
      if (normalizedQuery.includes('labyrinthe')) {
        if (haystack.includes('labyrinthe')) score += 6;
      }
      if (normalizedQuery.includes('mots') || normalizedQuery.includes('lettre') || normalizedQuery.includes('fléch')) {
        if (haystack.includes('mots') || haystack.includes('lettre') || haystack.includes('fléch')) score += 6;
      }
      if (normalizedQuery.includes('math') || normalizedQuery.includes('calcul')) {
        if (haystack.includes('math') || haystack.includes('calcul') || haystack.includes('nombre')) score += 6;
      }
      if (normalizedQuery.includes('anim') || normalizedQuery.includes('nature')) {
        if (haystack.includes('animal') || haystack.includes('nature')) score += 6;
      }
      if (normalizedQuery.includes('créa') || normalizedQuery.includes('craft')) {
        if (haystack.includes('créa') || haystack.includes('craft')) score += 6;
      }
      if (normalizedQuery.includes('3') || normalizedQuery.includes('5') || normalizedQuery.includes('6') || normalizedQuery.includes('8') || normalizedQuery.includes('9') || normalizedQuery.includes('12')) {
        if (haystack.includes('3-5') || haystack.includes('6-8') || haystack.includes('9-12')) score += 3;
      }

      return {
        ...item,
        score,
        difficulty: item.difficulty || inferDifficulty(query),
        objective: item.objective || inferObjective(query),
        imageUrl: item.imageUrl || inferImage(query)
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 6);
}

function createFallbackActivity(query, source) {
  const normalized = query.trim();
  let category = 'Exercice';
  let title = 'Activité personnalisée';
  let icon = '🧩';

  if (normalized.includes('coloriage') || normalized.includes('dessin')) {
    category = 'Coloriage';
    title = 'Dessin à colorier';
    icon = '🎨';
  } else if (normalized.includes('labyrinthe')) {
    category = 'Labyrinthe';
    title = 'Labyrinthe à suivre';
    icon = '🧭';
  } else if (normalized.includes('mots') || normalized.includes('lettre')) {
    category = 'Mots Fléchés';
    title = 'Jeu de lettres';
    icon = '🔤';
  } else if (normalized.includes('math') || normalized.includes('calcul')) {
    category = 'Exercice';
    title = 'Exercice de logique';
    icon = '🔢';
  } else if (normalized.includes('nature') || normalized.includes('anim')) {
    category = 'Exercice';
    title = 'Découverte de la nature';
    icon = '🌿';
  }

  return {
    id: Date.now(),
    title: `${title} pour enfant`,
    category,
    age: '6-8',
    icon,
    desc: `Activité créée à partir de votre demande : ${normalized}`
  };
}

function openManualAddModal() {
  openModal({
    title: 'Ajouter une activité manuellement',
    body: `
      <label for="manualTitle">Titre</label>
      <input id="manualTitle" type="text" placeholder="Ex. Labyrinthe arc-en-ciel" />
      <label for="manualCategory">Catégorie</label>
      <select id="manualCategory">
        <option value="Coloriage">Coloriage</option>
        <option value="Mots Fléchés">Mots Fléchés</option>
        <option value="Labyrinthe">Labyrinthe</option>
        <option value="Exercice">Exercice</option>
        <option value="Créativité">Créativité</option>
      </select>
      <label for="manualAge">Âge</label>
      <select id="manualAge">
        <option value="3-5">3 - 5 ans</option>
        <option value="6-8" selected>6 - 8 ans</option>
        <option value="9-12">9 - 12 ans</option>
      </select>
      <label for="manualDesc">Description</label>
      <textarea id="manualDesc" placeholder="Décris l’activité..."></textarea>
      <label for="manualImageUrl">URL d’image (optionnel)</label>
      <input id="manualImageUrl" type="url" placeholder="https://..." />
    `,
    confirmText: 'Ajouter',
    cancelText: 'Annuler',
    onConfirm: () => {
      const title = document.getElementById('manualTitle')?.value?.trim();
      const category = document.getElementById('manualCategory')?.value || 'Coloriage';
      const age = document.getElementById('manualAge')?.value || '6-8';
      const desc = document.getElementById('manualDesc')?.value?.trim() || '';
      const imageUrl = document.getElementById('manualImageUrl')?.value?.trim() || '';

      if (!title) {
        showResponse('Le titre est requis pour ajouter une activité.', 'info');
        return false;
      }

      const newItem = {
        id: Date.now(),
        title,
        category,
        age,
        icon: '🎨',
        imageUrl,
        desc
      };

      addCustomActivity(newItem);
      toggleSelection(newItem.id);
      searchResultIds = [newItem.id];
      renderGrid();
      showResponse('Activité ajoutée au profil.', 'success');
    }
  });
}