// ============================================
// VML Content Tool v2.0 — Content: Dropdown Autofiller
// ============================================

function injectValueIntoSelect(selectEl, value) {
  const normalizedValue = value === '-' ? '' : value;

  // Verificamos que la opción exista
  const hasOption = Array.from(selectEl.options).some(opt => opt.value === normalizedValue);
  if (!hasOption) return false;

  // Simulación humana de eventos (Focus -> Click -> Input -> Change -> Blur)
  selectEl.focus();
  ['focus', 'mousedown', 'mouseup', 'click'].forEach(evt => 
    selectEl.dispatchEvent(new Event(evt, { bubbles: true }))
  );

  if (normalizedValue !== '') {
    selectEl.dispatchEvent(new KeyboardEvent('keydown', { key: normalizedValue, code: `Key${normalizedValue}`, bubbles: true }));
  }

  selectEl.value = normalizedValue;
  Array.from(selectEl.options).forEach(opt => opt.selected = (opt.value === normalizedValue));

  selectEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  selectEl.dispatchEvent(new Event('change', { bubbles: true }));

  if (normalizedValue !== '') {
    selectEl.dispatchEvent(new KeyboardEvent('keyup', { key: normalizedValue, code: `Key${normalizedValue}`, bubbles: true }));
  }

  selectEl.blur();
  ['blur', 'focusout'].forEach(evt => 
    selectEl.dispatchEvent(new FocusEvent(evt, { bubbles: true }))
  );

  return true;
}

function findOptionRows(root) {
  let validRows = Array.from(root.querySelectorAll('tr.options--item')).filter(row => {
    if (row.children.length <= 4) return false;
    const rect = row.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  root.querySelectorAll('iframe').forEach(iframe => {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc?.body) validRows = validRows.concat(findOptionRows(doc.body));
    } catch (e) {}
  });
  return validRows;
}

function normalizeTitle(title) {
  if (typeof title !== 'string') return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function getNameColumnIndex(row) {
  const table = row.closest('table');
  if (!table) return -1;
  const headers = Array.from(table.querySelectorAll('thead th, th'));
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].textContent.trim().toLowerCase() === 'name') {
      return i;
    }
  }
  return -1;
}

function findRowByTitle(rows, title) {
  const normalizedTarget = title.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalizedTarget) return null;

  const targetKey = normalizeTitle(title);

  function isCellMatch(cell, targetTitle, targetNormalizedJcr) {
    if (!cell) return false;
    const cellText = cell.textContent.trim();
    if (cellText.toLowerCase().replace(/\s+/g, ' ') === targetTitle) {
      return true;
    }
    if (normalizeTitle(cellText) === targetNormalizedJcr) {
      return true;
    }
    return false;
  }

  for (const row of rows) {
    const nameColIndex = getNameColumnIndex(row);
    if (nameColIndex !== -1 && nameColIndex < row.children.length) {
      const cell = row.children[nameColIndex];
      if (isCellMatch(cell, normalizedTarget, targetKey)) {
        return row;
      }
    } else {
      // Fallback
      for (let i = 0; i < Math.min(row.children.length, 4); i++) {
        const cell = row.children[i];
        if (isCellMatch(cell, normalizedTarget, targetKey)) {
          return row;
        }
      }
    }
  }

  return null;
}

function isHeaderRow(row) {
  if (!row || row.length === 0) return false;
  const firstVal = row[0]?.trim().toLowerCase();
  const commonHeaders = ['name', 'title', 'element', 'elemento', 'option', 'options', 'caracteristica', 'característica'];
  return commonHeaders.includes(firstVal);
}

async function fillDropdowns(matrixData) {
  const rows = findOptionRows(document.body);
  if (!rows || rows.length === 0) {
    console.error('[VDM Options] No option rows found in DOM.');
    return { success: false, error: 'Options table not detected in AEM.' };
  }

  const startIndex = isHeaderRow(matrixData[0]) ? 1 : 0;

  // 1. Validation pass: check if all options exist in the DOM and have at least one S or O
  const missingTitles = [];
  let noOptionalityTitle = null;

  for (let i = startIndex; i < matrixData.length; i++) {
    const excelRow = matrixData[i];
    if (excelRow.length < 2) continue; // Needs Title and at least one option (S/O/-)

    const optionTitle = excelRow[0];
    const domRow = findRowByTitle(rows, optionTitle);

    if (!domRow) {
      console.warn(`[VDM Options] Option "${optionTitle}" not found in current page.`);
      missingTitles.push(optionTitle);
    } else {
      // Check if it has any S or O optionality
      const excelValues = excelRow.slice(1);
      const hasOptionality = excelValues.some(val => {
        const v = val?.trim().toUpperCase();
        return v === 'S' || v === 'O';
      });
      if (!hasOptionality && !noOptionalityTitle) {
        noOptionalityTitle = optionTitle;
      }
    }
  }

  if (noOptionalityTitle) {
    console.warn(`[VDM Options] Validation failed. Option "${noOptionalityTitle}" has no optionality on any trim. Aborting.`);
    return { success: false, error: `${noOptionalityTitle} has no optionalitys on any trim` };
  }

  if (missingTitles.length > 0) {
    let errorMsg = `"${missingTitles[0]}" not found in table`;
    if (missingTitles.length > 1) {
      errorMsg = `"${missingTitles[0]}" & others not found in table`;
    }
    console.warn(`[VDM Options] Validation failed. Missing options: ${missingTitles.join(', ')}. Aborting.`);
    return { success: false, error: errorMsg };
  }

  // 2. Filling pass (only runs if validation succeeded)
  let filledCount = 0;

  for (let i = startIndex; i < matrixData.length; i++) {
    const excelRow = matrixData[i];
    if (excelRow.length < 2) continue;

    const optionTitle = excelRow[0];
    const domRow = findRowByTitle(rows, optionTitle);

    // Trigger para renderizado
    (domRow.children[1] || domRow).click();
    await new Promise(r => setTimeout(r, 250));

    const selects = Array.from(domRow.querySelectorAll('select.custom-select'));
    const excelValues = excelRow.slice(1);

    for (let j = 0; j < Math.min(selects.length, excelValues.length); j++) {
      const targetSelect = selects[j];
      const val = excelValues[j]?.trim() || '';
      
      try {
        injectValueIntoSelect(targetSelect, val);
      } catch (err) {
        // Fallo silencioso en la inyección de una celda
      }
      
      // Delay de espera entre celdas para estabilidad de AEM
      await new Promise(r => setTimeout(r, 80));
    }
    
    filledCount++;
    await new Promise(r => setTimeout(r, 150));
  }
  return { success: filledCount > 0 };
}

// Listener global
if (!window.vmlDropdownInjected) {
  window.vmlDropdownInjected = true;
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'autoFillDropdowns') {
      fillDropdowns(req.data).then(sendResponse);
      return true;
    }
  });
}