// ========================================================
// VML Content Tool v2.0 — Popup: Specs VDM Comparator
// Parses TSV data and communicates with content script to
// compare Excel data with active specs tables.
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
  const compareInput = document.getElementById('compareInput');
  const btnCompare = document.getElementById('btnCompare');
  const btnClearCompare = document.getElementById('btnClearCompare');
  const compareStatus = document.getElementById('compareStatus');

  /**
   * Displays status messages with appropriate color class styling.
   */
  function showStatus(type, message) {
    compareStatus.textContent = message;
    compareStatus.className = 'autofill-status autofill-status--' + type;
    compareStatus.style.display = 'block';
  }

  /**
   * Parses TSV formatted copy-paste grid into a 2D array of cells.
   */
  function parseTSV(raw) {
    const lines = raw.split(/\r?\n/);
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }
    return lines.map(line => line.split('\t'));
  }

  // --- COMPARA TABLA BUTTON ---
  btnCompare.addEventListener('click', async () => {
    const raw = compareInput.value.replace(/\u00A0/g, ' ');

    if (!raw || raw.trim().length === 0) {
      showStatus('error', 'Textarea is empty. Paste cells from Excel to compare.');
      return;
    }

    const data = parseTSV(raw);
    if (data.length === 0) {
      showStatus('error', 'Could not parse any valid data from paste.');
      return;
    }

    // Visual feedback processing state
    btnCompare.disabled = true;
    btnCompare.textContent = 'COMPARING...';
    showStatus('info', 'Analyzing active specs table on page...');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        showStatus('error', 'Could not access the active tab.');
        btnCompare.disabled = false;
        btnCompare.textContent = 'COMPARE TABLE';
        return;
      }

      const url = tab.url || '';
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showStatus('error', 'This feature only works on web pages (http/https).');
        btnCompare.disabled = false;
        btnCompare.textContent = 'COMPARE TABLE';
        return;
      }

      chrome.tabs.sendMessage(tab.id, {
        action: 'compareSpecsTable',
        data: data
      }, (response) => {
        btnCompare.disabled = false;
        btnCompare.textContent = 'COMPARE TABLE';

        if (chrome.runtime.lastError) {
          showStatus('error', 'Communication error: Please reload the AEM page (F5) and try again.');
          return;
        }

        if (!response) {
          showStatus('error', 'No response from content script. Is an active VDM page open?');
          return;
        }

        if (response.success) {
          if (response.mismatchCount === 0) {
            showStatus('success', `✔ Perfect Match! Checked ${response.matchCount} cell(s) and all values match perfectly.`);
          } else {
            showStatus('error', `❌ Found ${response.mismatchCount} mismatch(es) (${response.matchCount} match(es)). Differences are highlighted on the page.`);
          }
        } else {
          showStatus('error', response.error || 'Unknown error occurred during comparison.');
        }
      });

    } catch (err) {
      btnCompare.disabled = false;
      btnCompare.textContent = 'COMPARE TABLE';
      showStatus('error', 'Unexpected error: ' + err.message);
    }
  });

  // --- CLEAR MARKS BUTTON ---
  btnClearCompare.addEventListener('click', async () => {
    compareInput.value = '';
    showStatus('info', 'Clearing marks...');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'clearSpecsHighlights' }, (response) => {
          if (chrome.runtime.lastError) {
            showStatus('info', 'Popup input cleared (Could not reach active page to clear highlights).');
            return;
          }
          showStatus('info', 'Marks and input cleared.');
          // Auto hide status message after 1.5s
          setTimeout(() => {
            compareStatus.style.display = 'none';
          }, 1500);
        });
      } else {
        compareStatus.style.display = 'none';
      }
    } catch (err) {
      console.error(err);
      compareStatus.style.display = 'none';
    }
  });
});
