// ============================================
// VML Content Tool v2.0 — Popup: Specs VDM Autofiller
// Parsea datos TSV pegados desde Excel y los envía
// al content script para autocompletar tablas AEM
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('autofillInput');
  const btn = document.getElementById('btnAutofill');
  const statusEl = document.getElementById('autofillStatus');

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
    const raw = textarea.value;

    if (!raw || raw.trim().length === 0) {
      showStatus('error', 'El textarea está vacío. Pegá las celdas desde Excel.');
      return;
    }

    const data = parseTSV(raw);

    if (data.length === 0) {
      showStatus('error', 'No se pudieron parsear datos válidos del texto pegado.');
      return;
    }

    // Feedback visual: mostrar que se está procesando
    btn.disabled = true;
    btn.textContent = 'PROCESANDO...';
    showStatus('info', `Enviando ${data.length} fila(s) al content script...`);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        showStatus('error', 'No se pudo acceder a la pestaña activa.');
        btn.disabled = false;
        btn.textContent = 'AUTOCOMPLETAR TABLA';
        return;
      }

      // Verificar que la URL sea válida (no chrome://, about:, etc.)
      const url = tab.url || '';
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showStatus('error', 'Esta función solo funciona en páginas web (http/https).');
        btn.disabled = false;
        btn.textContent = 'AUTOCOMPLETAR TABLA';
        return;
      }

      // Inyectar el script programáticamente por si la página no fue recargada
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content-autofiller.js']
        });
      } catch (injectErr) {
        console.warn('Inyección de script omitida o fallida:', injectErr);
        // Continuamos de todas formas por si ya estaba inyectado
      }

      chrome.tabs.sendMessage(tab.id, {
        action: 'autoFillTable',
        data: data
      }, (response) => {
        btn.disabled = false;
        btn.textContent = 'AUTOCOMPLETAR TABLA';

        if (chrome.runtime.lastError) {
          showStatus('error', 'Error de comunicación: Por favor recargá la página de AEM (F5) e intentá de nuevo.');
          return;
        }

        if (!response) {
          showStatus('error', 'Sin respuesta del content script. ¿Está abierta una página AEM?');
          return;
        }

        if (response.success) {
          showStatus('success',
            `✔ Completado: ${response.filled} celda(s) rellenada(s), ${response.skipped} omitida(s).`
          );
        } else {
          showStatus('error', response.error || 'Error desconocido al rellenar la tabla.');
        }
      });

    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'AUTOCOMPLETAR TABLA';
      showStatus('error', 'Error inesperado: ' + err.message);
    }
  });
});
