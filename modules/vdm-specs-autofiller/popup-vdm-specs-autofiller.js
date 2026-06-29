// ============================================
// VML Content Tool v2.0 — Popup: Specs VDM Autofiller
// Parsea datos TSV pegados desde Excel y los envía
// al content script para autocompletar tablas AEM
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('autofillInput');
  const btn = document.getElementById('btnAutofill');
  const statusEl = document.getElementById('autofillStatus');

  // --- Auto-Save Textarea Content ---
  const storageKey = 'saved_autofillInput';
  chrome.storage.local.get([storageKey], (result) => {
    if (result[storageKey]) {
      textarea.value = result[storageKey];
    }
  });
  textarea.addEventListener('input', () => {
    chrome.storage.local.set({ [storageKey]: textarea.value });
  });

  /**
   * Muestra un mensaje de estado en el popup con color según el tipo.
   * @param {'success'|'error'|'info'} type
   * @param {string} message
   */
  function showStatus(type, message) {
    statusEl.textContent = message;
    statusEl.className = 'autofill-status autofill-status--' + type;
    statusEl.style.display = 'block';
  }

  function parseTSV(raw) {
    const lines = raw.split(/\r?\n/);
    // Excel suele agregar un salto de línea extra al final de la selección
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }
    return lines.map(line => line.split('\t'));
  }

  // --- Botón AUTOCOMPLETAR ---
  btn.addEventListener('click', async () => {
    const raw = textarea.value.replace(/\u00A0/g, ' ');

    if (!raw || raw.trim().length === 0) {
      showStatus('error', 'Textarea is empty. Paste cells from Excel.');
      return;
    }

    const data = parseTSV(raw);

    if (data.length === 0) {
      showStatus('error', 'Could not parse valid data from pasted text.');
      return;
    }

    // Feedback visual: mostrar que se está procesando
    btn.disabled = true;
    btn.textContent = 'PROCESSING...';
    showStatus('info', `Sending ${data.length} row(s) to content script...`);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        showStatus('error', 'Could not access the active tab.');
        btn.disabled = false;
        btn.textContent = 'AUTOFILL TABLE';
        return;
      }

      // Verificar que la URL sea válida (no chrome://, about:, etc.)
      const url = tab.url || '';
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showStatus('error', 'This feature only works on web pages (http/https).');
        btn.disabled = false;
        btn.textContent = 'AUTOFILL TABLE';
        return;
      }

      // Inyectar el script programáticamente por si la página no fue recargada
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content-autofiller.js']
        });
      } catch (injectErr) {
        console.warn('Script injection skipped or failed:', injectErr);
        // Continuamos de todas formas por si ya estaba inyectado
      }

      chrome.tabs.sendMessage(tab.id, {
        action: 'autoFillTable',
        data: data
      }, (response) => {
        btn.disabled = false;
        btn.textContent = 'AUTOFILL TABLE';

        if (chrome.runtime.lastError) {
          showStatus('error', 'Communication error: Please reload the AEM page (F5) and try again.');
          return;
        }

        if (!response) {
          showStatus('error', 'No response from content script. Is an AEM page open?');
          return;
        }

        if (response.success) {
          showStatus('success',
            `✔ Completed: ${response.filled} cell(s) filled, ${response.skipped} skipped.`
          );
          inputEl.value = '';
          chrome.storage.local.remove(storageKey);
        } else {
          showStatus('error', response.error || 'Unknown error while filling table.');
        }
      });

    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'AUTOFILL TABLE';
      showStatus('error', 'Unexpected error: ' + err.message);
    }
  });
});
