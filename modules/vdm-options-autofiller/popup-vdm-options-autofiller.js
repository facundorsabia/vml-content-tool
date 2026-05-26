// ============================================
// VML Content Tool v2.0 — Popup: Dropdown Selector (Blindado)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('dropdownInput');
  const btn = document.getElementById('btnApplyDropdown');
  const statusEl = document.getElementById('dropdownStatus');

  function showStatus(type, message) {
    statusEl.textContent = message;
    statusEl.className = 'autofill-status autofill-status--' + type;
    statusEl.style.display = 'block';
  }

  btn.addEventListener('click', async () => {
    const rawValue = inputEl.value;
    if (!rawValue || rawValue.trim().length === 0) {
      showStatus('error', 'El campo de texto está vacío.');
      return;
    }

    const lines = rawValue.split(/\r?\n/).filter(line => line.trim() !== "");
    const matrixData = lines.map(line => line.includes('\t') ? line.split('\t') : line.trim().split(/\s+/));

    btn.disabled = true;
    btn.textContent = 'PROCESANDO...';
    showStatus('info', 'Completando...');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error('No se pudo acceder a la pestaña activa.');

      const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
      let responsesCount = 0;
      let successTargeted = false;

      frames.forEach((frame) => {
        chrome.tabs.sendMessage(
          tab.id, 
          { action: 'autoFillDropdowns', data: matrixData }, 
          { frameId: frame.frameId }, 
          (response) => {
            // Manejo de errores de conexión silenciado
            if (chrome.runtime.lastError) {
              // El frame no tiene el listener, es normal en AEM
            } else if (response && response.success) {
              successTargeted = true;
            }

            responsesCount++;
            if (responsesCount === frames.length) {
              btn.disabled = false;
              btn.textContent = 'APLICAR EN DROPDOWNS';
              successTargeted 
                ? showStatus('success', '✔ ¡Celdas autocompletadas!') 
                : showStatus('error', 'No se detectó la tabla de opciones en AEM.');
            }
          }
        );
      });
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'APLICAR EN DROPDOWNS';
      showStatus('error', 'Error: ' + err.message);
    }
  });
});