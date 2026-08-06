const STORAGE_KEYS = {
  profiles: 'kidprint_profiles',
  currentProfile: 'kidprint_current_profile',
  custom: 'custom_items',
  favorites: 'favorite_items',
  selected: 'selected_items',
  history: 'search_history'
};

const ONBOARDING_KEY = 'kidprint_onboarding_seen';

let items = [];
let customItems = [];
let favorites = [];
let selectedIds = [];
let searchHistory = [];
let searchResultIds = [];
let favOnly = false;
let profiles = [];
let currentProfile = null;
let currentPage = 1;
const pageSize = 10;
const maxPages = 10; // maximum pages to display (10 pages * 10 items = 100 results)
let onboardingStep = 0;
const onboardingSteps = [
  {
    title: '1. Crée un profil',
    description: 'Choisis ou créé un profil pour chaque enfant afin de sauvegarder les activités séparément et organiser facilement tes listes.'
  },
  {
    title: '2. Recherche une activité',
    description: 'Écris une demande simple et précise pour trouver un coloriage, un labyrinthe ou une activité créative adaptée à l’âge de l’enfant.'
  },
  {
    title: '3. Ajoute à ta sélection',
    description: 'Clique sur “Ajouter” pour préparer les activités à imprimer. Les éléments sélectionnés seront ensuite transformés en PDF.'
  },
  {
    title: '4. Imprime ton PDF',
    description: 'Ouvre le PDF de sélection, vérifie tes activités, puis imprime uniquement les fiches dont tu as besoin.'
  }
];

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
  window.showOnboarding = showOnboarding;

  renderProfileSelector();
  loadActivities();
  checkOnboarding();
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

function checkOnboarding() {
  if (!localStorage.getItem(ONBOARDING_KEY)) {
    setTimeout(() => {
      showOnboarding(true);
    }, 800);
  }
}

function showOnboarding(force = false, step = 0) {
  onboardingStep = Math.max(0, Math.min(step, onboardingSteps.length - 1));
  const current = onboardingSteps[onboardingStep];

  const isLastStep = onboardingStep === onboardingSteps.length - 1;

  openModal({
    title: current.title,
    body: `
      <div class="onboarding-content">
        <div class="onboarding-step">
          <p>${current.description}</p>
        </div>
        <div class="onboarding-progress">Étape ${onboardingStep + 1} sur ${onboardingSteps.length}</div>
      </div>
    `,
    confirmText: isLastStep ? 'C’est parti !' : 'Suivant',
    cancelText: onboardingStep === 0 ? (force ? 'Ne plus afficher' : 'Annuler') : 'Précédent',
    onConfirm: () => {
      if (!isLastStep) {
        showOnboarding(force, onboardingStep + 1);
        return false;
      }
      localStorage.setItem(ONBOARDING_KEY, 'true');
      return true;
    },
    onCancel: () => {
      if (onboardingStep === 0) {
        if (force) {
          localStorage.setItem(ONBOARDING_KEY, 'true');
        }
        closeModal();
      } else {
        showOnboarding(force, onboardingStep - 1);
      }
    }
  });
}

async function fetchWithTimeout(url, options = {}, timeout = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
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

function openModal({ title, body, confirmText = 'OK', cancelText = 'Annuler', onConfirm, onCancel }) {
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

  cancelBtn?.addEventListener('click', () => {
    if (typeof onCancel === 'function') {
      onCancel();
    } else {
      closeModal();
    }
  });
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
  currentPage = 1;
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

function sanitizeSvgText(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createColoringSvgDataUri(query = '') {
  const normalized = (query || '').toLowerCase();
  const label = query.trim() ? sanitizeSvgText(query.trim()) : 'Coloriage';
  let shapeMarkup = '';

  if (/dino|dinosaure/.test(normalized)) {
    shapeMarkup = `
      <path d="M120 420 q40 -80 80 -40 q20 -40 60 -20 q20 -10 30 -40 q15 -30 45 -20 q10 20 0 40 q-5 15 -15 20 q15 20 30 40 q10 10 5 20 q0 20 -20 10 q-30 -10 -70 0 q-30 10 -70 -10 q-50 -20 -50 0 q0 15 25 15 z" fill="none" stroke="#000" stroke-width="10"/>`;
  } else if (/licorne/.test(normalized)) {
    shapeMarkup = `
      <path d="M120 420 q40 -120 120 -120 q70 0 120 80 q40 70 70 50 q0 30 -40 40 q-30 10 -90 -20 q-40 10 -50 -20 q-25 20 -55 0 q-30 -20 -50 -10 z" fill="none" stroke="#000" stroke-width="10"/>
      <path d="M260 180 l40 -100 l20 80" fill="none" stroke="#000" stroke-width="10"/>
      <path d="M230 250 q-20 -30 -10 -70" fill="none" stroke="#000" stroke-width="10"/>
      <path d="M240 210 q20 -30 60 -30" fill="none" stroke="#000" stroke-width="8"/>`;
  } else if (/papillon/.test(normalized)) {
    shapeMarkup = `
      <path d="M200 320 q-90 -120 -20 -180 q80 -70 140 -20 q30 30 30 70 q0 40 -40 40 q-40 0 -40 -40 q0 -20 20 -40" fill="none" stroke="#000" stroke-width="10"/>
      <path d="M300 320 q90 -120 20 -180 q-80 -70 -140 -20 q-30 30 -30 70 q0 40 40 40 q40 0 40 -40 q0 -20 -20 -40" fill="none" stroke="#000" stroke-width="10"/>
      <circle cx="240" cy="280" r="18" fill="none" stroke="#000" stroke-width="10"/>`;
  } else if (/mer|océan|poisson|requin/.test(normalized)) {
    shapeMarkup = `
      <path d="M120 390 q80 -70 140 -50 q20 0 70 25 q15 10 40 15 q10 5 15 20 q10 30 -20 40 q-30 15 -80 10 q-40 -5 -85 -15 q-30 0 -30 -30 z" fill="none" stroke="#000" stroke-width="10"/>
      <path d="M220 345 q-20 -40 10 -70" fill="none" stroke="#000" stroke-width="8"/>
      <circle cx="230" cy="360" r="12" fill="none" stroke="#000" stroke-width="8"/>`;
  } else if (/fleur|jardin|nature|arbre/.test(normalized)) {
    shapeMarkup = `
      <circle cx="180" cy="240" r="30" fill="none" stroke="#000" stroke-width="10"/>
      <path d="M180 240 l-70 -40 l20 70 l-20 -70 l70 40 z" fill="none" stroke="#000" stroke-width="8"/>
      <path d="M180 240 l70 -40 l-20 70 l20 -70 l-70 40 z" fill="none" stroke="#000" stroke-width="8"/>
      <path d="M180 240 l0 150" fill="none" stroke="#000" stroke-width="12"/>
      <path d="M140 450 q40 40 80 0" fill="none" stroke="#000" stroke-width="10"/>`;
  } else {
    shapeMarkup = `
      <path d="M120 430 h180 v-140 h120 v140 h180" fill="none" stroke="#000" stroke-width="10"/>
      <path d="M140 430 q40 -70 120 -70 q80 0 120 70" fill="none" stroke="#000" stroke-width="10"/>
      <path d="M320 260 l0 -90 l40 20" fill="none" stroke="#000" stroke-width="10"/>
      <circle cx="360" cy="220" r="18" fill="none" stroke="#000" stroke-width="10"/>`;
  }

  const keywords = query
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 5)
    .map((word) => sanitizeSvgText(word.replace(/[^\wÀ-ÿ-]/g, '')))
    .filter(Boolean);

  const keywordLines = keywords
    .map((word, index) => `<text x="540" y="220" dy="${index * 36}" font-size="28" fill="none" stroke="#000" stroke-width="1" paint-order="stroke">${word}</text>`)
    .join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
      <rect width="800" height="600" fill="#fff" />
      <text x="50" y="70" font-size="40" font-weight="700" fill="none" stroke="#000" stroke-width="2" paint-order="stroke">Coloriage</text>
      <text x="50" y="110" font-size="28" fill="#000">${label}</text>
      <g transform="translate(40, 120)">
        ${shapeMarkup}
      </g>
      ${keywordLines}
      <g stroke="#000" stroke-width="6" fill="none">
        <path d="M50 540 c60 -80 120 -80 180 0" />
        <path d="M220 540 c60 -80 120 -80 180 0" />
      </g>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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
  if (normalized.includes('coloriage') || normalized.includes('dessin')) return createColoringSvgDataUri(query);
  if (normalized.includes('labyrinthe')) return 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80';
  if (normalized.includes('mot') || normalized.includes('lettre')) return 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80';
  if (normalized.includes('math') || normalized.includes('calcul')) return 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&w=800&q=80';
  return 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=800&q=80';
}

function getImageUrlForItem(item) {
  if (item.imageUrl) return item.imageUrl;
  if (item.category === 'Coloriage') return createColoringSvgDataUri(item.title || item.desc || 'Coloriage');
  return inferImage(item.title || item.desc || '');
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
  requestAnimationFrame(renderGrid);
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

  const limitedItems = visibleItems.slice(0, pageSize * maxPages);
  const totalPages = Math.max(1, Math.min(maxPages, Math.ceil(limitedItems.length / pageSize)));
  if (currentPage > totalPages) currentPage = totalPages;
  const pagedItems = limitedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (limitedItems.length === 0) {
    grid.innerHTML = '<div class="empty-state">Aucune activité ne correspond à ce filtre pour l’instant.</div>';
    renderPagination(0, 0);
    updateBundleBar();
    return;
  }

  grid.innerHTML = pagedItems.map((item) => buildCardMarkup(item)).join('');
  renderPagination(totalPages, limitedItems.length);
  updateFavoriteCount();
  updateBundleBar();
}

function renderPagination(totalPages, resultCount = 0) {
  const pagination = document.getElementById('paginationControls');
  if (!pagination) return;

  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  const prevDisabled = currentPage <= 1 ? 'disabled' : '';
  const nextDisabled = currentPage >= totalPages ? 'disabled' : '';

  const pageButtons = Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;
    return `<button class="page-btn ${page === currentPage ? 'active' : ''}" type="button" onclick="goToPage(${page})">${page}</button>`;
  }).join('');

  pagination.innerHTML = `
    <div class="pagination-info">Page ${currentPage} sur ${totalPages} (${resultCount} résultats affichés)</div>
    <div class="pagination-actions">
      <button class="page-control" type="button" onclick="previousPage()" ${prevDisabled}>« Précédent</button>
      ${pageButtons}
      <button class="page-control" type="button" onclick="nextPage()" ${nextDisabled}>Suivant »</button>
    </div>
  `;
}

function goToPage(page) {
  currentPage = Math.max(1, Math.min(page, maxPages));
  renderGrid();
}

function previousPage() {
  if (currentPage > 1) {
    currentPage -= 1;
    renderGrid();
  }
}

function nextPage() {
  currentPage += 1;
  renderGrid();
}

function buildCardMarkup(item) {
  const isFavorite = favorites.includes(item.id);
  const isSelected = selectedIds.includes(item.id);
  const imageUrl = getImageUrlForItem(item);
  const imageMarkup = imageUrl
    ? `<img class="card-img" src="${imageUrl}" alt="${item.title}" loading="lazy" decoding="async" onerror="this.style.display='none'; this.parentElement.innerHTML += '<div class=\'card-img-fallback\'>${item.icon || '🎨'}</div>'">`
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
    const imageUrl = getImageUrlForItem(item);
    const imageBlock = imageUrl
      ? `<img src="${imageUrl}" alt="${item.title}" class="print-image" onerror="this.style.display='none';">`
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
  currentPage = 1;
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
  currentPage = 1;
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
  currentPage = 1;
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
    const response = await fetchWithTimeout('/.netlify/functions/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, action: 'search' })
    }, 3000);

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
    const response = await fetchWithTimeout('/.netlify/functions/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, action: 'import_url' })
    }, 3000);

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
    desc: `Activité créée à partir de votre demande : ${normalized}`,
    imageUrl: category === 'Coloriage' ? createColoringSvgDataUri(normalized) : ''
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