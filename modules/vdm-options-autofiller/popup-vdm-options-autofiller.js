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
    const rawValue = inputEl.value.replace(/\u00A0/g, ' ');
    if (!rawValue || rawValue.trim().length === 0) {
      showStatus('error', 'Text field is empty.');
      return;
    }

    const lines = rawValue.split(/\r?\n/).filter(line => line.trim() !== "");
    const matrixData = lines.map(line => line.includes('\t') ? line.split('\t') : line.trim().split(/\s+/));

    btn.disabled = true;
    btn.textContent = 'PROCESSING...';
    showStatus('info', 'Filling...');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error('Could not access the active tab.');

      const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
      let responsesCount = 0;
      let successTargeted = false;

      frames.forEach((frame) => {
        chrome.tabs.sendMessage(
          tab.id, 
          { action: 'autoFillDropdowns', data: matrixData }, 
          { frameId: frame.frameId }, 
          (response) => {
            // Silent connection error handling
            if (chrome.runtime.lastError) {
              // The frame doesn't have the listener, this is normal in AEM
            } else if (response && response.success) {
              successTargeted = true;
            }

            responsesCount++;
            if (responsesCount === frames.length) {
              btn.disabled = false;
              btn.textContent = 'APPLY TO DROPDOWNS';
              successTargeted 
                ? showStatus('success', '✔ Cells autofilled!') 
                : showStatus('error', 'Options table not detected in AEM.');
            }
          }
        );
      });
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'APPLY TO DROPDOWNS';
      showStatus('error', 'Error: ' + err.message);
    }
  });
});