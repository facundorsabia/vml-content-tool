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
      showStatus('error', 'Text field is empty.');
      return;
    }

    const cleanedData = rawValue.replace(/\u00A0/g, ' ');
    const parsedRows = parseTSV(cleanedData);
    const matrixData = parsedRows.map(row => row.map(c => c.trim())).filter(row => row.length > 0 && row.some(c => c !== ""));

    if (matrixData.length === 0) {
      showStatus('error', 'No valid rows detected.');
      return;
    }

    function isOptionCode(val) {
      if (val === undefined || val === null) return true;
      const v = val.trim().toUpperCase();
      return v === 'S' || v === 'O' || v === '-' || v === '';
    }

    const hasHeaders = matrixData.length > 1 && !isOptionCode(matrixData[0][0]);
    const rowsToCheck = hasHeaders ? matrixData.slice(1) : matrixData;
    const isMissingNameColumn = rowsToCheck.every(row => isOptionCode(row[0]));

    if (isMissingNameColumn) {
      showStatus('error', 'Missing "Name" column. Please copy the "Name" column along with the options.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'PROCESSING...';
    showStatus('info', 'Filling...');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error('Could not access the active tab.');

      const frames = await chrome.webNavigation.getAllFrames({ tabId: tab.id });
      let responsesCount = 0;
      let successTargeted = false;
      let lastErrorMsg = '';
      let missingList = [];

      frames.forEach((frame) => {
        chrome.tabs.sendMessage(
          tab.id, 
          { action: 'autoFillDropdowns', data: matrixData }, 
          { frameId: frame.frameId }, 
          (response) => {
            // Silent connection error handling
            if (chrome.runtime.lastError) {
              // The frame doesn't have the listener, this is normal in AEM
            } else if (response) {
              if (response.success) {
                successTargeted = true;
              } else if (response.error) {
                if (response.error === 'missing_options' && response.missingTitles) {
                  missingList = missingList.concat(response.missingTitles);
                  lastErrorMsg = 'Validation failed: Equipments not found.';
                } else {
                  lastErrorMsg = response.error;
                }
              }
            }

            responsesCount++;
            if (responsesCount === frames.length) {
              btn.disabled = false;
              btn.textContent = 'APPLY TO DROPDOWNS';
              if (missingList.length > 0) {
                const uniqueMissing = [...new Set(missingList)];
                showStatus('error', '⚠️ Process aborted due to missing equipments.');
                
                const modal = document.getElementById('vmlModal');
                document.getElementById('vmlModalText').innerText = "We couldn't find the following Equipments in the AEM table. Please review your list for typos or missing items:";
                document.getElementById('vmlModalList').innerHTML = uniqueMissing.map(m => `<li>${m}</li>`).join('');
                modal.style.display = 'flex';
                
                document.getElementById('vmlModalClose').onclick = () => modal.style.display = 'none';
                document.getElementById('vmlModalOkBtn').onclick = () => modal.style.display = 'none';
              } else if (successTargeted) {
                showStatus('success', '✔ Cells autofilled!');
              } else if (lastErrorMsg) {
                showStatus('error', lastErrorMsg);
              } else {
                showStatus('error', 'Options table not detected in AEM.');
              }
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

function parseTSV(text) {
  const lines = [];
  let currentLine = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === '\t') {
        currentLine.push(currentCell);
        currentCell = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentLine.push(currentCell);
        lines.push(currentLine);
        currentLine = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }
  
  if (currentCell || currentLine.length > 0) {
    currentLine.push(currentCell);
    lines.push(currentLine);
  }
  return lines;
}