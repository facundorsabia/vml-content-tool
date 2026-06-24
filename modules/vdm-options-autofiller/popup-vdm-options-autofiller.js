// ============================================
// VML Content Tool v2.0 — Popup: Dropdown Selector (Blindado)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('dropdownInput');
  const btn = document.getElementById('btnApplyDropdown');
  const statusEl = document.getElementById('dropdownStatus');

  // --- Auto-Save Textarea Content ---
  const storageKey = 'saved_dropdownInput';
  chrome.storage.local.get([storageKey], (result) => {
    if (result[storageKey]) {
      inputEl.value = result[storageKey];
    }
  });
  inputEl.addEventListener('input', () => {
    chrome.storage.local.set({ [storageKey]: inputEl.value });
  });

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
      let noOptionalityList = [];

      // Enviar SOLO al frame principal (frameId 0) para evitar ejecuciones duplicadas
      // en iframes internos de AEM que causaban llenado en categorías incorrectas.
      chrome.tabs.sendMessage(
        tab.id, 
        { action: 'autoFillDropdowns', data: matrixData }, 
        { frameId: 0 }, 
        (response) => {
          btn.disabled = false;
          btn.textContent = 'APPLY TO DROPDOWNS';

          if (chrome.runtime.lastError) {
            showStatus('error', 'Error: Ensure you are on the AEM page and have RELOADED the tab.');
            return;
          }

          if (!response) {
            showStatus('error', 'Options table not detected in AEM.');
            return;
          }

          if (response.success) {
            showStatus('success', '✔ Cells autofilled!');
          } else if (response.error === 'missing_options' && response.missingTitles) {
            const uniqueMissing = [...new Set(response.missingTitles)];
            showStatus('error', '⚠️ Process aborted due to missing equipments.');
            
            const modal = document.getElementById('vmlModal');
            document.getElementById('vmlModalText').innerText = "We couldn't find the following Equipments in the AEM table. Please review your list for typos or missing items:";
            const listEl = document.getElementById('vmlModalList');
            listEl.textContent = '';
            uniqueMissing.forEach(m => {
              const li = document.createElement('li');
              li.textContent = m;
              listEl.appendChild(li);
            });
            modal.style.display = 'flex';
            
            document.getElementById('vmlModalClose').onclick = () => modal.style.display = 'none';
            document.getElementById('vmlModalOkBtn').onclick = () => modal.style.display = 'none';
          } else if (response.error === 'no_optionality' && response.optionTitle) {
            showStatus('error', '⚠️ Process aborted due to missing optionality.');
            
            const modal = document.getElementById('vmlModal');
            document.getElementById('vmlModalText').innerText = "The following Option(s) have no optionalities (S or O) configured for any trim in the Excel file. Please review:";
            const listEl = document.getElementById('vmlModalList');
            listEl.textContent = '';
            const li = document.createElement('li');
            li.textContent = response.optionTitle;
            listEl.appendChild(li);
            modal.style.display = 'flex';
            
            document.getElementById('vmlModalClose').onclick = () => modal.style.display = 'none';
            document.getElementById('vmlModalOkBtn').onclick = () => modal.style.display = 'none';
          } else if (response.error) {
            showStatus('error', response.error);
          } else {
            showStatus('error', 'Options table not detected in AEM.');
          }
        }
      );
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