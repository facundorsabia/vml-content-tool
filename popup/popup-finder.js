// ============================================
// VML Content Tool v2.0 — Popup: Exact Disclosure Finder
// Módulo de UI para búsqueda exacta + navegación
// ============================================

// === DOM References ===
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsCountEl = document.getElementById('resultsCount');
const currentMatchEl = document.getElementById('currentMatch');
const totalMatchesEl = document.getElementById('totalMatches');
const prevBtn = document.getElementById('prevMatch');
const nextBtn = document.getElementById('nextMatch');

// === State ===
let currentMatchIndex = 0;
let totalFound = 0;

// === UI Update ===
function updateFinderUI() {
  resultsCountEl.textContent = totalFound;
  currentMatchEl.textContent = currentMatchIndex;
  totalMatchesEl.textContent = totalFound;

  // Enable/disable nav buttons
  prevBtn.disabled = currentMatchIndex <= 1;
  nextBtn.disabled = currentMatchIndex >= totalFound;
}

// Search button
searchBtn.addEventListener('click', () => {
  const query = searchInput.value.trim();
  if (!query) return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0] || !tabs[0].id) return;

    // Verificar que la pestaña sea una página web válida (no chrome://, about:, etc.)
    const url = tabs[0].url || '';
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
      totalFound = 0;
      currentMatchIndex = 0;
      updateFinderUI();
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'exactMatchSearch',
      query: query
    }, (response) => {
      if (chrome.runtime.lastError) {
        totalFound = 0;
        currentMatchIndex = 0;
        updateFinderUI();
        return;
      }

      totalFound = response?.count || 0;
      currentMatchIndex = totalFound > 0 ? 1 : 0;
      updateFinderUI();
    });
  });
});

// Allow Enter key to trigger search
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    searchBtn.click();
  }
});

// Navigate to next match
nextBtn.addEventListener('click', () => {
  if (currentMatchIndex < totalFound) {
    currentMatchIndex++;
    navigateToMatch(currentMatchIndex);
  }
});

// Navigate to previous match
prevBtn.addEventListener('click', () => {
  if (currentMatchIndex > 1) {
    currentMatchIndex--;
    navigateToMatch(currentMatchIndex);
  }
});

function navigateToMatch(index) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0] || !tabs[0].id) return;

    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'navigateMatch',
      index: index - 1 // 0-based for content script
    });
  });
  updateFinderUI();
}

// Initialize finder UI
updateFinderUI();
