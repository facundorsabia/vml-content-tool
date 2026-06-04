// ========================================================
// VML Content Tool v2.0 — Popup: VDM Options Comparator
// Parses TSV data and communicates with content script to
// compare Excel data with active options tables.
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
  const compareOptionsInput = document.getElementById('compareOptionsInput');
  const btnCompareOptions = document.getElementById('btnCompareOptions');
  const btnClearCompareOptions = document.getElementById('btnClearCompareOptions');
  const compareOptionsStatus = document.getElementById('compareOptionsStatus');

  /**
   * Displays status messages with appropriate color class styling.
   */
  function showStatus(type, message) {
    compareOptionsStatus.textContent = message;
    compareOptionsStatus.className = 'autofill-status autofill-status--' + type;
    compareOptionsStatus.style.display = 'block';
  }

  /**
   * Parses TSV formatted copy-paste grid into a 2D array of cells.
   * Supports fallback formatting when tabs are converted to 2 or more spaces.
   */
  function parseTSV(raw) {
    const lines = raw.split(/\r?\n/);
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }
    const hasTabs = raw.includes('\t');
    return lines.map(line => {
      if (hasTabs) {
        return line.split('\t');
      } else {
        return line.split(/\t| {2,}/);
      }
    });
  }

  // --- COMPARE OPTIONS TABLE BUTTON ---
  btnCompareOptions.addEventListener('click', async () => {
    const raw = compareOptionsInput.value.replace(/\u00A0/g, ' ');

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
    btnCompareOptions.disabled = true;
    btnCompareOptions.textContent = 'COMPARING...';
    showStatus('info', 'Analyzing active options table on page...');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        showStatus('error', 'Could not access the active tab.');
        btnCompareOptions.disabled = false;
        btnCompareOptions.textContent = 'COMPARE OPTIONS';
        return;
      }

      const url = tab.url || '';
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showStatus('error', 'This feature only works on web pages (http/https).');
        btnCompareOptions.disabled = false;
        btnCompareOptions.textContent = 'COMPARE OPTIONS';
        return;
      }

      chrome.tabs.sendMessage(tab.id, {
        action: 'compareOptionsTable',
        data: data
      }, (response) => {
        btnCompareOptions.disabled = false;
        btnCompareOptions.textContent = 'COMPARE OPTIONS';

        if (chrome.runtime.lastError) {
          showStatus('error', 'Communication error: Please reload the AEM page (F5) and try again.');
          return;
        }

        if (!response) {
          showStatus('error', 'No response from content script. Is an active VDM Options page open?');
          return;
        }

        if (response.success) {
          const diffsContainer = document.getElementById('compareOptionsDiffs');
          if (response.mismatchCount === 0) {
            showStatus('success', `✔ Perfect Match! Checked ${response.matchCount} cell(s) and all values match perfectly.`);
            if (diffsContainer) diffsContainer.style.display = 'none';
          } else {
            showStatus('error', `❌ Found ${response.mismatchCount} mismatch(es) (${response.matchCount} match(es)). Differences are highlighted on the AEM page.`);
            
            if (diffsContainer) {
              diffsContainer.innerHTML = '';
              const ul = document.createElement('ul');
              ul.style.margin = '0';
              ul.style.paddingLeft = '14px';
              ul.style.color = '#ff6b6b';
              response.differences.forEach(d => {
                const li = document.createElement('li');
                li.style.marginBottom = '4px';
                li.innerHTML = `<strong>${d.rowName}</strong> (${d.model}): Expected <code>${d.expected}</code>, got <code>${d.actual}</code>`;
                ul.appendChild(li);
              });
              diffsContainer.appendChild(ul);
              diffsContainer.style.display = 'block';
            }
          }
        } else {
          showStatus('error', response.error || 'Unknown error occurred during comparison.');
          const diffsContainer = document.getElementById('compareOptionsDiffs');
          if (diffsContainer) diffsContainer.style.display = 'none';
        }
      });

    } catch (err) {
      btnCompareOptions.disabled = false;
      btnCompareOptions.textContent = 'COMPARE OPTIONS';
      showStatus('error', 'Unexpected error: ' + err.message);
    }
  });

  // --- CLEAR MARKS BUTTON ---
  btnClearCompareOptions.addEventListener('click', async () => {
    compareOptionsInput.value = '';
    showStatus('info', 'Clearing marks...');
    const diffsContainer = document.getElementById('compareOptionsDiffs');
    if (diffsContainer) {
      diffsContainer.innerHTML = '';
      diffsContainer.style.display = 'none';
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'clearOptionsHighlights' }, (response) => {
          if (chrome.runtime.lastError) {
            showStatus('info', 'Popup input cleared (Could not reach active page to clear highlights).');
            return;
          }
          showStatus('info', 'Marks and input cleared.');
          // Auto hide status message after 1.5s
          setTimeout(() => {
            compareOptionsStatus.style.display = 'none';
          }, 1500);
        });
      } else {
        compareOptionsStatus.style.display = 'none';
      }
    } catch (err) {
      console.error(err);
      compareOptionsStatus.style.display = 'none';
    }
  });
});
