// ============================================
// VML Content Tool v2.0 — Content: Dropdown Autofiller
// ============================================

function injectValueIntoSelect(selectEl, value) {
  const normalizedValue = value === '-' ? '' : value;

  // Verificamos que la opción exista
  const hasOption = Array.from(selectEl.options).some(opt => opt.value === normalizedValue);
  if (!hasOption) return false;

  const rowTitle = selectEl.closest('tr')?.querySelector('td')?.textContent?.trim() || 'Unknown Row';
  console.log(`[VDM Options] Injecting "${normalizedValue}" into select name="${selectEl.name}" for option "${rowTitle}"`);

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

function isElementVisible(el) {
  if (!el) return false;
  
  // Si directamente no tiene layout (display: none)
  if (el.offsetParent === null) return false;
  
  // Revisar la caja actual
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  
  // Revisar si algún contenedor padre lo está ocultando con height: 0 y overflow: hidden (típico en accordions)
  let parent = el.parentElement;
  while (parent && parent !== document.body) {
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') return false;
    
    // Si el padre está colapsado y oculta el desbordamiento
    if (parseFloat(parentStyle.height) === 0 && parentStyle.overflow !== 'visible') {
      return false;
    }
    
    // Bootstrap Vue <b-collapse> a veces deja height pequeña o display none
    if (parent.classList.contains('collapse') && !parent.classList.contains('show')) {
      return false;
    }
    
    parent = parent.parentElement;
  }
  
  return true;
}

function findOptionRows(root) {
  let validRows = Array.from(root.querySelectorAll('tr.options--item')).filter(row => {
    // Las filas reales de opciones tienen celdas <th scope="row"> (los valores S/O/P por trim)
    // Las filas de categorías y subcategorías solo tienen <td> — nunca tienen <th scope="row">
    const hasTrimCells = row.querySelector('th[scope="row"]') !== null;
    if (!hasTrimCells) return false;
    
    // Validar visibilidad estricta
    return isElementVisible(row);
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

function matchModelName(aemModel, excelModel) {
  if (typeof aemModel !== 'string' || typeof excelModel !== 'string') return false;
  const normAem = aemModel.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normExcel = excelModel.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normAem || !normExcel) return false;
  return normAem.endsWith(normExcel);
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

function findRowByTitle(rows, title, usedRows = null) {
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
    if (usedRows && usedRows.has(row)) continue;

    const nameColIndex = getNameColumnIndex(row);
    if (nameColIndex !== -1 && nameColIndex < row.children.length) {
      const cell = row.children[nameColIndex];
      if (isCellMatch(cell, normalizedTarget, targetKey)) {
        if (usedRows) usedRows.add(row);
        return row;
      }
    } else {
      // Fallback
      for (let i = 0; i < Math.min(row.children.length, 4); i++) {
        const cell = row.children[i];
        if (isCellMatch(cell, normalizedTarget, targetKey)) {
          if (usedRows) usedRows.add(row);
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
  const commonHeaders = [
    'name', 'title', 'element', 'elemento', 'option', 'options',
    'caracteristica', 'característica', 'equipment', 'equipments',
    'equipamiento', 'equipamientos'
  ];
  return commonHeaders.includes(firstVal);
}

async function fillDropdowns(matrixData) {
  // Encontrar el contenedor activo de la subcategoría seleccionada.
  // AEM marca la subcategoría seleccionada con is-selected en la lista.
  // La tabla de opciones a llenar está SIEMPRE dentro del div.mt-4 
  // que sigue al <tr class="options--item is-selected">.
  let searchRoot = document.body;

  const selectedSubRow = document.querySelector('tr.options--item.is-selected');
  if (selectedSubRow) {
    // Subir hasta el table, luego al padre del table (div contenedor)
    const subTable = selectedSubRow.closest('table');
    if (subTable) {
      // El div.mt-4 del formulario de la subcategoría es hermano siguiente del table
      let sibling = subTable.nextElementSibling;
      while (sibling) {
        // Buscamos el div.mt-4 que tenga la label "Options" adentro
        if (sibling.matches('div') && sibling.querySelector('label') && 
            Array.from(sibling.querySelectorAll('label')).some(l => l.textContent.trim() === 'Options')) {
          searchRoot = sibling;
          console.log('[VDM Options] Scoped to active subcategory container:', sibling);
          break;
        }
        sibling = sibling.nextElementSibling;
      }
    }
  }

  const rows = findOptionRows(searchRoot);
  if (!rows || rows.length === 0) {
    console.error('[VDM Options] No option rows found in DOM.');
    return { success: false, error: 'Options table not detected in AEM.' };
  }

  const hasHeaders = isHeaderRow(matrixData[0]);
  const startIndex = hasHeaders ? 1 : 0;
  const excelColToAemColMap = [];

  if (hasHeaders) {
    const firstRow = rows[0];
    const table = firstRow.closest('table');
    const headerRow = table ? table.querySelector('thead tr') : null;
    const domHeaders = headerRow ? Array.from(headerRow.children) : [];
    
    let nameColIndex = -1;
    for (let i = 0; i < domHeaders.length; i++) {
      if (domHeaders[i].textContent.trim().toLowerCase() === 'name') {
        nameColIndex = i;
        break;
      }
    }
    const modelStartColIndex = nameColIndex !== -1 ? nameColIndex + 1 : 2;

    const aemModels = [];
    for (let i = modelStartColIndex; i < domHeaders.length; i++) {
      const headerText = domHeaders[i].textContent.trim();
      if (headerText) {
        aemModels.push({
          colIndex: i,
          name: headerText
        });
      }
    }

    const excelHeaders = matrixData[0];
    excelColToAemColMap[0] = -1; // Option Name
    for (let j = 1; j < excelHeaders.length; j++) {
      const excelModelName = excelHeaders[j]?.trim() || '';
      if (!excelModelName) {
        excelColToAemColMap[j] = -1;
        continue;
      }

      let matchedAemColIndex = -1;
      for (const aemModel of aemModels) {
        if (matchModelName(aemModel.name, excelModelName)) {
          matchedAemColIndex = aemModel.colIndex;
          break;
        }
      }
      excelColToAemColMap[j] = matchedAemColIndex;
    }

    console.log('[VDM Options] Excel column mapping:', excelColToAemColMap);
  }

  // 1. Validation pass: check if all options exist in the DOM and have at least one S or O
  const missingTitles = [];
  let noOptionalityTitle = null;
  const validationUsedRows = new Set();

  for (let i = startIndex; i < matrixData.length; i++) {
    const excelRow = matrixData[i];
    if (excelRow.length < 2) continue; // Needs Title and at least one option (S/O/-)

    const excelValues = excelRow.slice(1);
    // Si todas las celdas de valores están vacías, asumimos que es una fila de título (Categoría/Subcategoría) y la ignoramos.
    const isCompletelyEmpty = excelValues.every(val => !val || val.trim() === '');
    if (isCompletelyEmpty) {
      continue;
    }

    const optionTitle = excelRow[0];
    const domRow = findRowByTitle(rows, optionTitle, validationUsedRows);

    if (!domRow) {
      console.warn(`[VDM Options] Option "${optionTitle}" not found in current page.`);
      missingTitles.push(optionTitle);
    } else {
      // Check if it has any S or O optionality
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
    return { success: false, error: 'no_optionality', optionTitle: noOptionalityTitle };
  }

  if (missingTitles.length > 0) {
    console.warn(`[VDM Options] Validation failed. Missing options: ${missingTitles.join(', ')}. Aborting.`);
    return { success: false, error: 'missing_options', missingTitles: missingTitles };
  }

  // 2. Filling pass (only runs if validation succeeded)
  let filledCount = 0;
  const fillingUsedRows = new Set();

  for (let i = startIndex; i < matrixData.length; i++) {
    const excelRow = matrixData[i];
    if (excelRow.length < 2) continue;

    const excelValues = excelRow.slice(1);
    const isCompletelyEmpty = excelValues.every(val => !val || val.trim() === '');
    if (isCompletelyEmpty) {
      continue;
    }

    const optionTitle = excelRow[0];
    const domRow = findRowByTitle(rows, optionTitle, fillingUsedRows);

    // Trigger para renderizado
    if (domRow) {
      (domRow.children[1] || domRow).click();
      await new Promise(r => setTimeout(r, 250));
    } else {
      continue;
    }

    if (hasHeaders) {
      for (let j = 1; j < excelRow.length; j++) {
        const aemColIndex = excelColToAemColMap[j];
        if (aemColIndex === undefined || aemColIndex === -1) continue;

        const cell = domRow.children[aemColIndex];
        const targetSelect = cell ? cell.querySelector('select.custom-select') : null;
        if (!targetSelect) continue;

        const val = excelRow[j]?.trim() || '';
        try {
          injectValueIntoSelect(targetSelect, val);
        } catch (err) {
          // Fallo silencioso en la inyección de una celda
        }
        
        // Delay de espera entre celdas para estabilidad de AEM
        await new Promise(r => setTimeout(r, 80));
      }
    } else {
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