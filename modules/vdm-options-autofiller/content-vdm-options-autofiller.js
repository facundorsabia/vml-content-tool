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
  let validRows = Array.from(root.querySelectorAll('tr.options--item')).filter(row => row.children.length > 4);

  root.querySelectorAll('iframe').forEach(iframe => {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc?.body) validRows = validRows.concat(findOptionRows(doc.body));
    } catch (e) {}
  });
  return validRows;
}

async function fillDropdowns(matrixData) {
  const rows = findOptionRows(document.body);
  if (!rows || rows.length === 0) return { success: false };

  for (let i = 0; i < Math.min(matrixData.length, rows.length); i++) {
    const domRow = rows[i];
    const excelRow = matrixData[i];

    // Highlight visual de fila
    const originalBg = domRow.style.backgroundColor;
    domRow.style.transition = 'background-color 0.2s ease';
    domRow.style.backgroundColor = 'rgba(255, 68, 68, 0.2)';

    // Trigger para renderizado
    (domRow.children[1] || domRow).click();
    await new Promise(r => setTimeout(r, 250));

    const selects = Array.from(domRow.querySelectorAll('select.custom-select'));
    const excelOffset = (excelRow[0] && !['S', 'O', '-'].includes(excelRow[0].trim())) ? 1 : 0;

    for (let j = 0; j < Math.min(selects.length, excelRow.length - excelOffset); j++) {
      const targetSelect = selects[j];
      const val = excelRow[j + excelOffset]?.trim() || '';
      
      // Highlight visual de celda individual
      const originalShadow = targetSelect.style.boxShadow;
      targetSelect.style.boxShadow = '0 0 0 2px #ff4444';

      try {
        injectValueIntoSelect(targetSelect, val);
      } catch (err) {
        // Fallo silencioso en la inyección de una celda
      } finally {
        // Aseguramos la limpieza del highlight visual
        await new Promise(r => setTimeout(r, 80));
        targetSelect.style.boxShadow = originalShadow;
      }
    }
    
    // Limpieza de highlight de fila
    domRow.style.backgroundColor = originalBg;
    await new Promise(r => setTimeout(r, 150));
  }
  return { success: true };
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