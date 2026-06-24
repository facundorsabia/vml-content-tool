// ============================================
// VML Content Tool v2.0 — Popup: Cloud Specs Autofiller
// Parsea datos TSV pegados desde Excel y los envía
// al content script para autocompletar AEM Content Fragments
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('cloudSpecsInput');
  const btn = document.getElementById('btnCloudSpecsAutofill');
  const statusEl = document.getElementById('cloudSpecsStatus');

  // --- Auto-Save Textarea Content ---
  const storageKey = 'saved_cloudSpecsInput';
  chrome.storage.local.get([storageKey], (result) => {
    if (result[storageKey]) {
      textarea.value = result[storageKey];
    }
  });
  textarea.addEventListener('input', () => {
    chrome.storage.local.set({ [storageKey]: textarea.value });
  });

  if (!textarea || !btn || !statusEl) return;

  function showStatus(type, message) {
    statusEl.textContent = message;
    statusEl.className = 'autofill-status autofill-status--' + type;
    statusEl.style.display = 'block';
  }

  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  function parseCloudSpecs(raw) {
    const lines = raw.split(/\r?\n/);
    const fields = [];
    let currentTitle = null;
    let currentValueLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const tabIndex = line.indexOf('\t');
      
      if (tabIndex !== -1) {
        if (currentTitle !== null) {
          fields.push({
            title: currentTitle,
            value: currentValueLines.join('\n').trim()
          });
        }
        
        currentTitle = line.substring(0, tabIndex).trim();
        const valuePart = line.substring(tabIndex + 1).trim();
        currentValueLines = valuePart ? [valuePart] : [];
      } else {
        if (currentTitle !== null) {
          currentValueLines.push(line.trim());
        }
      }
    }

    if (currentTitle !== null) {
      fields.push({
        title: currentTitle,
        value: currentValueLines.join('\n').trim()
      });
    }

    return fields;
  }

  // Formatting for Cloud Specs:
  // <p>Title</p>
  // <p>^^</p>
  // <p>Value</p>
  function formatDataAsHtml(fields) {
    return fields.map(field => {
      const title = escapeHtml(field.title || '');
      let valueHtml = '';
      
      if (field.value) {
        const valLines = field.value.split('\n');
        valueHtml = valLines
          .map(l => l.trim())
          .filter(l => l !== '')
          .map(l => `<p>${escapeHtml(l)}</p>`)
          .join('\n');
      } else {
        valueHtml = '<p><br></p>';
      }

      return `<p>${title}</p>\n<p>^^</p>\n${valueHtml}`;
    });
  }

  btn.addEventListener('click', async () => {
    let raw = textarea.value.replace(/\u00A0/g, ' ');
    raw = raw.replace(/[\u2028\u2029]/g, '\n');

    if (!raw || raw.trim().length === 0) {
      showStatus('error', 'Textarea is empty. Paste cells from Excel.');
      return;
    }

    const data = parseCloudSpecs(raw);
    if (data.length === 0) {
      showStatus('error', 'Could not parse valid data from pasted text.');
      return;
    }

    const formattedData = formatDataAsHtml(data);

    btn.disabled = true;
    btn.textContent = 'PROCESSING...';
    showStatus('info', `Sending ${formattedData.length} row(s) to content script...`);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        showStatus('error', 'Could not access the active tab.');
        btn.disabled = false;
        btn.textContent = 'AUTOFILL CLOUD SPECS';
        return;
      }

      const url = tab.url || '';
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showStatus('error', 'This feature only works on web pages (http/https).');
        btn.disabled = false;
        btn.textContent = 'AUTOFILL CLOUD SPECS';
        return;
      }

      chrome.tabs.sendMessage(tab.id, {
        action: 'autoFillCloudSpecs',
        data: formattedData
      }, (response) => {
        btn.disabled = false;
        btn.textContent = 'AUTOFILL CLOUD SPECS';

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
            `✔ Completed: ${response.filled} field(s) filled.`
          );
        } else {
          showStatus('error', response.error || 'Unknown error while filling table.');
        }
      });

    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'AUTOFILL CLOUD SPECS';
      showStatus('error', 'Unexpected error: ' + err.message);
    }
  });
});
