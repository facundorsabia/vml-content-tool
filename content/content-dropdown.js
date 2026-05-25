// ============================================
// VML Content Tool v2.0 — Content: Dropdown Selector
// ============================================

console.log('[VML Dropdown] Script inicializado en el marco:', window.location.href);

function injectValueIntoSelect(selectEl, value) {
  const normalizedValue = value === '-' ? '' : value;

  const hasOption = Array.from(selectEl.options).some(opt => opt.value === normalizedValue);
  if (!hasOption) {
    return false;
  }

  selectEl.focus();
  selectEl.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
  selectEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  selectEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  selectEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));

  if (normalizedValue !== '') {
    selectEl.dispatchEvent(new KeyboardEvent('keydown', { key: normalizedValue, code: `Key${normalizedValue}`, bubbles: true }));
  }

  selectEl.value = normalizedValue;
  Array.from(selectEl.options).forEach(opt => {
    opt.selected = (opt.value === normalizedValue);
  });

  selectEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  selectEl.dispatchEvent(new Event('change', { bubbles: true }));

  if (normalizedValue !== '') {
    selectEl.dispatchEvent(new KeyboardEvent('keyup', { key: normalizedValue, code: `Key${normalizedValue}`, bubbles: true }));
  }

  selectEl.blur();
  selectEl.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  selectEl.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

  return true;
}

function findOptionRows(root) {
  let allRows = Array.from(root.querySelectorAll('tr.options--item'));
  let validRows = allRows.filter(row => row.children.length > 4);

  const iframes = root.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc && doc.body) {
        validRows = validRows.concat(findOptionRows(doc.body));
      }
    } catch (e) {}
  }
  return validRows;
}

async function fillDropdowns(matrixData) {
  const rows = findOptionRows(document.body);

  if (!rows || rows.length === 0) {
    return { success: false, isDropdownFrame: false };
  }

  console.log(`[VML Dropdown] Detectadas ${rows.length} filas válidas. Excel tiene ${matrixData.length} filas.`);

  let filled = 0;
  let skipped = 0;

  const rowsToProcess = Math.min(matrixData.length, rows.length);

  for (let i = 0; i < rowsToProcess; i++) {
    const domRow = rows[i];
    const excelRow = matrixData[i];

    // --- 🎨 HIGHLIGHT FILA (Rojo suave) ---
    const originalRowBg = domRow.style.backgroundColor;
    const originalRowTransition = domRow.style.transition;
    domRow.style.transition = 'background-color 0.2s ease';
    domRow.style.backgroundColor = 'rgba(255, 68, 68, 0.2)';

    // 1. Clic en la fila
    const clickTarget = domRow.children[1] || domRow;
    clickTarget.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    clickTarget.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    clickTarget.click();

    // 2. Esperamos renderizado
    await new Promise(resolve => setTimeout(resolve, 250));

    let selects = Array.from(domRow.querySelectorAll('select.custom-select'));
    if (selects.length === 0) {
      selects = Array.from(document.querySelectorAll('select.custom-select'));
    }

    let excelOffset = 0;
    if (excelRow[0]) {
      const firstVal = excelRow[0].trim();
      if (firstVal !== 'S' && firstVal !== 'O' && firstVal !== '-') {
        excelOffset = 1; 
      }
    }

    // 4. Llenamos los dropdowns
    for (let j = 0; j < selects.length; j++) {
      const dataIndex = j + excelOffset;
      if (dataIndex >= excelRow.length) break;

      const value = excelRow[dataIndex] ? excelRow[dataIndex].trim() : '';
      const targetSelect = selects[j];
      
      // --- 🎨 HIGHLIGHT SELECTOR (Borde rojo brillante) ---
      const originalBoxShadow = targetSelect.style.boxShadow;
      targetSelect.style.boxShadow = '0 0 0 2px #ff4444';

      try {
        if (injectValueIntoSelect(targetSelect, value)) {
          filled++;
        } else {
          skipped++;
        }
      } catch (err) {
        skipped++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 80));
      
      // --- 🎨 LIMPIAR HIGHLIGHT SELECTOR ---
      targetSelect.style.boxShadow = originalBoxShadow;
    }
    
    // --- 🎨 LIMPIAR HIGHLIGHT FILA ---
    domRow.style.backgroundColor = originalRowBg;
    setTimeout(() => { domRow.style.transition = originalRowTransition; }, 200);

    await new Promise(resolve => setTimeout(resolve, 150));
  }

  return { success: true, filled, skipped };
}

if (!window.vmlDropdownInjected) {
  window.vmlDropdownInjected = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'autoFillDropdowns') {
      fillDropdowns(request.data).then(result => {
        sendResponse(result);
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }
  });
}