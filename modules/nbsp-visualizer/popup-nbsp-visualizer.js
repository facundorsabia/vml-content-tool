// ============================================
// VML Content Tool v2.0 — Popup: NBSP Detector
// Módulo de UI para el toggle y slider de NBSP
// ============================================

// === DOM References ===
const checkbox = document.getElementById('statusCheckbox');
const statusDot = document.getElementById('statusDot');
const statusLabel = document.getElementById('statusLabel');

// === UI Update ===
function updateNbspUI(isActive) {
  checkbox.checked = isActive;

  if (isActive) {
    statusDot.classList.add('on');
    statusLabel.textContent = 'ON';
  } else {
    statusDot.classList.remove('on');
    statusLabel.textContent = 'OFF';
  }
}

// Load initial state
chrome.storage.local.get(['active'], (result) => {
  const active = !!result.active;
  updateNbspUI(active);
});

// Toggle listener
checkbox.addEventListener('change', () => {
  const newState = checkbox.checked;

  chrome.storage.local.set({ active: newState }, () => {
    updateNbspUI(newState);

    // Recargar la pestaña actual para aplicar/quitar los resaltados
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
  });
});
