// ============================================
// VML Content Tool v2.0 — Popup: HTag Visualizer
// Módulo de UI para el toggle de HTags
// ============================================

// === DOM References ===
const htagCheckbox = document.getElementById('htagStatusCheckbox');
const htagStatusDot = document.getElementById('htagStatusDot');
const htagStatusLabel = document.getElementById('htagStatusLabel');

// === UI Update ===
function updateHtagUI(isActive) {
  htagCheckbox.checked = isActive;

  if (isActive) {
    htagStatusDot.classList.add('on');
    htagStatusLabel.textContent = 'ON';
  } else {
    htagStatusDot.classList.remove('on');
    htagStatusLabel.textContent = 'OFF';
  }
}

// Load initial state
chrome.storage.local.get(['htagsActive'], (result) => {
  const active = !!result.htagsActive;
  updateHtagUI(active);
});

// Toggle listener
htagCheckbox.addEventListener('change', () => {
  const newState = htagCheckbox.checked;

  chrome.storage.local.set({ htagsActive: newState }, () => {
    updateHtagUI(newState);

    // Recargar la pestaña actual para aplicar/quitar los resaltados
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
  });
});
