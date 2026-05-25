// ============================================
// VML Content Tool v2.0 — Popup: Dropdown Selector
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

    const lines = rawValue.split(/\r?\n/);
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }

    // Armamos una MATRIZ (Array de arrays) para saber cuándo cambiar de fila
    const matrixData = lines.map(line => {
      return line.includes('\t') ? line.split('\t') : line.trim().split(/\s+/);
    });

    btn.disabled = true;
    btn.textContent = 'PROCESANDO...';
    showStatus('info', 'Haciendo clic y completando filas...');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        showStatus('error', 'No se pudo acceder a la pestaña activa.');
        btn.disabled = false;
        btn.textContent = 'APLICAR EN DROPDOWNS';
        return;
      }

      const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
      
      let responsesCount = 0;
      let successTargeted = false;

      frames.forEach((frame) => {
        chrome.tabs.sendMessage(
          tab.id, 
          { action: 'autoFillDropdowns', data: matrixData }, 
          { frameId: frame.frameId }, 
          (response) => {
            responsesCount++;

            // Si el frame devolvió éxito en la inyección
            if (response && response.success) {
              successTargeted = true;
            }

            // Cuando todos los frames terminaron de responder
            if (responsesCount === frames.length) {
              btn.disabled = false;
              btn.textContent = 'APLICAR EN DROPDOWNS';

              if (successTargeted) {
                // Mensaje limpio y directo, sin números
                showStatus('success', '✔ ¡Celdas autocompletadas con éxito!');
              } else {
                showStatus('error', 'No se detectó la tabla de opciones en AEM.');
              }
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