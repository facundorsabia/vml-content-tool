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
    htagStatusLabel.textContent = 'ENCENDIDO';
  } else {
    htagStatusDot.classList.remove('on');
    htagStatusLabel.textContent = 'APAGADO';
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

    // Enviar mensaje dinámico en lugar de recargar la página
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleHtags', isActive: newState }, () => {
          if (chrome.runtime.lastError) {
            // Silencioso si el content script no está cargado
          }
        });
      }
    });
  });
});
